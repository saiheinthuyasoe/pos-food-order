"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Category, MenuItem, MenuItemOptionGroup } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Search, ShoppingCart, X, Plus, Minus } from "lucide-react";

// ─── Food Detail Modal ──────────────────────────────────────────────────────
interface ModalProps {
  item: MenuItem;
  onClose: () => void;
  onAdd: (
    item: MenuItem,
    qty: number,
    options: Record<string, string | string[]>,
  ) => void;
}
function FoodDetailModal({ item, onClose, onAdd }: ModalProps) {
  const { fmt } = useCurrency();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string | string[]>>(
    {},
  );
  const [added, setAdded] = useState(false);

  const extraCost =
    item.optionGroups?.reduce((sum, g) => {
      const sel = selected[g.label];
      if (Array.isArray(sel)) {
        return (
          sum +
          sel.reduce((s, name) => {
            const opt = g.options.find((o) => o.name === name);
            return s + (opt?.extraCost ?? 0);
          }, 0)
        );
      }
      const opt = g.options.find((o) => o.name === sel);
      return sum + (opt?.extraCost ?? 0);
    }, 0) ?? 0;
  const total = (item.price + extraCost) * qty;

  const requiredMissing =
    item.optionGroups?.filter((g) => {
      if (!g.required) return false;
      const sel = selected[g.label];
      if (Array.isArray(sel)) return sel.length === 0;
      return !sel;
    }).length ?? 0;

  const toggleOption = (group: MenuItemOptionGroup, optName: string) => {
    if (group.multiSelect) {
      setSelected((prev) => {
        const current = prev[group.label];
        const arr = Array.isArray(current) ? current : [];
        return {
          ...prev,
          [group.label]: arr.includes(optName)
            ? arr.filter((n) => n !== optName)
            : [...arr, optName],
        };
      });
    } else {
      setSelected((prev) => ({ ...prev, [group.label]: optName }));
    }
  };

  const isOptionSelected = (group: MenuItemOptionGroup, optName: string) => {
    const sel = selected[group.label];
    if (group.multiSelect) return Array.isArray(sel) && sel.includes(optName);
    return sel === optName;
  };

  const handleAdd = () => {
    onAdd(item, qty, selected);
    setAdded(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="relative h-52 bg-amber-50">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover sm:rounded-t-2xl"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl">
                🍽️
              </div>
            )}
          </div>
          <button
            title="Close"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-xl font-bold text-gray-800">{item.name}</h2>
            <span className="text-lg font-bold text-amber-600">
              {fmt(item.price)}
            </span>
          </div>
          {item.dietaryTags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.dietaryTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-gray-500 text-sm mb-4">{item.description}</p>

          {/* Option groups */}
          {item.optionGroups?.map((group: MenuItemOptionGroup) => (
            <div key={group.label} className="mb-4">
              <p className="font-medium text-gray-700 mb-2 text-sm">
                {group.label}
                {group.required && <span className="text-red-500 ml-1">*</span>}
                {group.multiSelect && (
                  <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    multi-select
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.options.map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => toggleOption(group, opt.name)}
                    className={`p-2 text-sm border rounded-xl text-left transition-all ${
                      isOptionSelected(group, opt.name)
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:border-amber-300"
                    }`}
                  >
                    {opt.name}
                    {opt.extraCost > 0 && (
                      <span className="text-xs ml-1 opacity-70">
                        +{fmt(opt.extraCost)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                title="setQuantity"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2 hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-semibold">{qty}</span>
              <button
                title="setQuantity"
                onClick={() => setQty(qty + 1)}
                className="px-3 py-2 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              title="Add to Cart"
              onClick={handleAdd}
              disabled={requiredMissing > 0 || added}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                added
                  ? "bg-green-500 text-white"
                  : requiredMissing > 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              {added ? "✓ Added!" : `Add to Cart — ${fmt(total)}`}
            </button>
          </div>
          {requiredMissing > 0 && (
            <p className="text-xs text-red-400 mt-2">
              Please select required options above
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Menu Page ──────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const { addItem, totalItems } = useCart();
  const { fmt } = useCurrency();
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocs(query(collection(db, "categories"), orderBy("displayOrder"))).then(
      (snap) =>
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category),
        ),
    );
    getDocs(
      query(collection(db, "menu_items"), where("available", "==", true)),
    ).then((snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem)),
    );
  }, []);

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      activeCategory === "all" || item.categoryId === activeCategory;
    return matchSearch && matchCat;
  });

  const handleAddFromModal = (
    item: MenuItem,
    qty: number,
    options: Record<string, string | string[]>,
  ) => {
    const extraCost =
      item.optionGroups?.reduce((sum, g) => {
        const sel = options[g.label];
        if (Array.isArray(sel)) {
          return (
            sum +
            sel.reduce((s, name) => {
              const opt = g.options.find((o) => o.name === name);
              return s + (opt?.extraCost ?? 0);
            }, 0)
          );
        }
        const opt = g.options.find((o) => o.name === sel);
        return sum + (opt?.extraCost ?? 0);
      }, 0) ?? 0;
    addItem(
      {
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        unitPrice: item.price + extraCost,
        selectedOptions: options,
      },
      qty,
    );
  };

  const handleQuickAdd = (item: MenuItem) => {
    const key = item.id;
    addItem({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.price,
    });
    setAddedKeys((prev) => new Set(prev).add(key));
    setTimeout(
      () =>
        setAddedKeys((prev) => {
          const s = new Set(prev);
          s.delete(key);
          return s;
        }),
      1500,
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" ref={topRef}>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Menu</h1>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveCategory("all");
          }}
          placeholder="Search dishes…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
        />
        {search && (
          <button
            title="Clear search"
            onClick={() => setSearch("")}
            className="absolute right-3 top-2.5"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${
              activeCategory === "all"
                ? "bg-amber-500 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${
                activeCategory === cat.id
                  ? "bg-amber-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p>No items found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-stretch overflow-hidden"
            >
              {/* Content */}
              <div
                className="flex-1 text-left p-4 flex flex-col justify-between min-w-0 cursor-pointer"
                onClick={() => setSelected(item)}
              >
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 text-sm leading-snug flex-1">
                      {item.name}
                    </h3>
                  </div>
                  {item.dietaryTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {item.dietaryTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-amber-600 text-sm">
                    {fmt(item.price)}
                  </p>
                  {item.optionGroups?.length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(item);
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Customize
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(item);
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-full font-bold transition-all ${
                        addedKeys.has(item.id)
                          ? "bg-green-500 text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {addedKeys.has(item.id) ? (
                        <span className="text-xs">✓</span>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Image */}
              <button
                className="relative flex-shrink-0 w-28 sm:w-36 bg-amber-50 block rounded-r-2xl overflow-hidden"
                onClick={() => setSelected(item)}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-3xl">
                    🍽️
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating cart */}
      {totalItems > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl shadow-xl font-medium z-40"
        >
          <ShoppingCart className="w-5 h-5" />
          View Cart ({totalItems})
        </Link>
      )}

      {/* Food detail modal */}
      {selected && (
        <FoodDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onAdd={handleAddFromModal}
        />
      )}
    </div>
  );
}
