"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  getCountFromServer,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Category } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchCategories = async () => {
    const q = query(
      collection(db, "categories"),
      orderBy("displayOrder", "asc"),
    );
    const snap = await getDocs(q);
    const cats: Category[] = [];
    for (const d of snap.docs) {
      const itemSnap = await getCountFromServer(
        query(collection(db, "menu_items"), where("categoryId", "==", d.id)),
      );
      cats.push({
        id: d.id,
        ...d.data(),
        itemCount: itemSnap.data().count,
      } as Category);
    }
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    await addDoc(collection(db, "categories"), {
      name: newName.trim(),
      displayOrder: categories.length + 1,
      createdAt: serverTimestamp(),
    });
    setNewName("");
    setAdding(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Delete this category? Items in this category will not be deleted.",
      )
    )
      return;
    await deleteDoc(doc(db, "categories", id));
    fetchCategories();
  };

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, "categories", id), { name: editName.trim() });
    setEditId(null);
    fetchCategories();
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const a = categories[index];
    const b = categories[swapIndex];
    await Promise.all([
      updateDoc(doc(db, "categories", a.id), { displayOrder: b.displayOrder }),
      updateDoc(doc(db, "categories", b.id), { displayOrder: a.displayOrder }),
    ]);
    fetchCategories();
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Categories</h1>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">
            No categories yet. Add one above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Items
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr
                  key={cat.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveOrder(idx, "up")}
                        disabled={idx === 0}
                        className="disabled:opacity-30 hover:text-amber-600"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveOrder(idx, "down")}
                        disabled={idx === categories.length - 1}
                        className="disabled:opacity-30 hover:text-amber-600"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editId === cat.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded border border-amber-400 px-2 py-1 text-sm focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(cat.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-800">
                        {cat.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {cat.itemCount ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {editId === cat.id ? (
                        <>
                          <button
                            onClick={() => handleEditSave(cat.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditId(cat.id);
                              setEditName(cat.name);
                            }}
                            className="text-gray-400 hover:text-amber-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
