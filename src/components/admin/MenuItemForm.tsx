"use client";

import { useState, FormEvent, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Category, MenuItemOptionGroup } from "@/types";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";

const DIETARY_TAGS = ["vegetarian", "vegan", "gluten-free", "spicy"];

interface Props {
  categories: Category[];
  initial?: Partial<MenuItem>;
  itemId?: string; // undefined = create new
}

export default function MenuItemForm({ categories, initial, itemId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState<number>(initial?.price ?? 0);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? "");
  const [dietaryTags, setDietaryTags] = useState<string[]>(
    initial?.dietaryTags ?? [],
  );
  const [optionGroups, setOptionGroups] = useState<MenuItemOptionGroup[]>(
    initial?.optionGroups ?? [],
  );
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleTag = (tag: string) =>
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const addOptionGroup = () =>
    setOptionGroups((prev) => [
      ...prev,
      {
        label: "",
        required: false,
        multiSelect: false,
        options: [{ name: "", extraCost: 0 }],
      },
    ]);

  const updateGroup = (
    gi: number,
    field: keyof MenuItemOptionGroup,
    value: unknown,
  ) =>
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, [field]: value } : g)),
    );

  const addOption = (gi: number) =>
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, options: [...g.options, { name: "", extraCost: 0 }] }
          : g,
      ),
    );

  const updateOption = (
    gi: number,
    oi: number,
    field: "name" | "extraCost",
    value: string | number,
  ) =>
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              options: g.options.map((o, j) =>
                j === oi ? { ...o, [field]: value } : o,
              ),
            }
          : g,
      ),
    );

  const removeOption = (gi: number, oi: number) =>
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g,
      ),
    );

  const removeGroup = (gi: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== gi));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        finalImageUrl = data.url;
      }

      const data = {
        name,
        categoryId,
        description,
        price,
        imageUrl: finalImageUrl,
        dietaryTags,
        optionGroups,
        available,
        featured,
        updatedAt: serverTimestamp(),
      };

      if (itemId) {
        await updateDoc(doc(db, "menu_items", itemId), data);
      } else {
        await addDoc(collection(db, "menu_items"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      router.push("/admin/menu");
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          title="Button"
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {itemId ? "Edit Menu Item" : "Add New Menu Item"}
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {/* Name + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Item Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Grilled Chicken Burger"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              title="Category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Short description…"
          />
        </div>

        {/* Price */}
        <div>
          <label className="label">Base Price ($)</label>
          <input
            title="number"
            type="number"
            min={0}
            step={0.01}
            required
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className={inputCls}
          />
        </div>

        {/* Photo */}
        <div>
          <label className="label">Photo</label>
          <div className="flex items-center gap-4">
            {imagePreview && (
              <Image
                src={imagePreview}
                alt="preview"
                width={80}
                height={80}
                className="w-20 h-20 rounded-lg object-cover border"
              />
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600"
            >
              {imagePreview ? "Change photo" : "Upload photo"}
            </button>
            <input
              title="Image File"
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>

        {/* Dietary Tags */}
        <div>
          <label className="label">Dietary Tags</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium border capitalize transition-colors ${
                  dietaryTags.includes(tag)
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "border-gray-300 text-gray-600 hover:border-amber-400"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <Toggle
            label="Available"
            checked={available}
            onChange={setAvailable}
          />
          <Toggle label="Featured" checked={featured} onChange={setFeatured} />
        </div>
      </div>

      {/* Option Groups */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">
            Options (size, extras, etc.)
          </h2>
          <button
            type="button"
            onClick={addOptionGroup}
            className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Group
          </button>
        </div>
        {optionGroups.length === 0 && (
          <p className="text-sm text-gray-400">
            No option groups. Click &quot;Add Group&quot; to create one.
          </p>
        )}
        {optionGroups.map((group, gi) => (
          <div
            key={gi}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <input
                value={group.label}
                onChange={(e) => updateGroup(gi, "label", e.target.value)}
                placeholder="Group label (e.g. Size)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
              />
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) =>
                    updateGroup(gi, "required", e.target.checked)
                  }
                />
                Required
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={!!group.multiSelect}
                  onChange={(e) =>
                    updateGroup(gi, "multiSelect", e.target.checked)
                  }
                />
                Multiple
              </label>
              <button
                title="Button"
                type="button"
                onClick={() => removeGroup(gi)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {group.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2 ml-4">
                <input
                  value={opt.name}
                  onChange={(e) => updateOption(gi, oi, "name", e.target.value)}
                  placeholder="Option name"
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                />
                <span className="text-gray-400 text-sm">+$</span>
                <input
                  title="Extra Cost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={opt.extraCost}
                  onChange={(e) =>
                    updateOption(gi, oi, "extraCost", Number(e.target.value))
                  }
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                />
                <button
                  title="Button"
                  type="button"
                  onClick={() => removeOption(gi, oi)}
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(gi)}
              className="ml-4 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              + Add option
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : itemId ? "Save Changes" : "Create Item"}
        </button>
      </div>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? "bg-amber-500" : "bg-gray-300"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </button>
      {label}
    </label>
  );
}
