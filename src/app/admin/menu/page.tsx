"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Category } from "@/types";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [itemsSnap, catsSnap] = await Promise.all([
      getDocs(query(collection(db, "menu_items"), orderBy("name"))),
      getDocs(query(collection(db, "categories"), orderBy("displayOrder"))),
    ]);
    const cats = catsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Category,
    );
    const menuItems = itemsSnap.docs.map((d) => {
      const item = { id: d.id, ...d.data() } as MenuItem;
      item.categoryName =
        cats.find((c) => c.id === item.categoryId)?.name ?? "—";
      return item;
    });
    setItems(menuItems);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleAvailable = async (item: MenuItem) => {
    await updateDoc(doc(db, "menu_items", item.id), {
      available: !item.available,
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, available: !i.available } : i,
      ),
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    await deleteDoc(doc(db, "menu_items", id));
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || i.categoryId === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
        <Link
          href="/admin/menu/new"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" /> Add New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No items found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Item
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Price
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Available
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                          🍽️
                        </div>
                      )}
                      <span className="font-medium text-gray-800">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.categoryName}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailable(item)}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${item.available ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${item.available ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/menu/${item.id}/edit`}
                        className="text-gray-400 hover:text-amber-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
