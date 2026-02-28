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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RestaurantTable, TableStatus } from "@/types";
import { Plus, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<TableStatus, string> = {
  free: "bg-green-100 text-green-700 border-green-200",
  occupied: "bg-red-100 text-red-700 border-red-200",
  reserved: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const STATUS_CYCLE: TableStatus[] = ["free", "occupied", "reserved"];

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newSeats, setNewSeats] = useState("4");
  const [adding, setAdding] = useState(false);

  const fetchTables = async () => {
    const snap = await getDocs(
      query(collection(db, "tables"), orderBy("tableNumber")),
    );
    setTables(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RestaurantTable),
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const cycleStatus = async (table: RestaurantTable) => {
    const nextIndex =
      (STATUS_CYCLE.indexOf(table.status) + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    await updateDoc(doc(db, "tables", table.id), { status: nextStatus });
    setTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, status: nextStatus } : t)),
    );
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNumber || !newSeats) return;
    setAdding(true);
    await addDoc(collection(db, "tables"), {
      tableNumber: Number(newNumber),
      seats: Number(newSeats),
      status: "free" as TableStatus,
      createdAt: serverTimestamp(),
    });
    setNewNumber("");
    setNewSeats("4");
    setShowAdd(false);
    setAdding(false);
    fetchTables();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this table?")) return;
    await deleteDoc(doc(db, "tables", id));
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tables</h1>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Table Number
            </label>
            <input
              type="number"
              min={1}
              required
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-28 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Seats
            </label>
            <input
              type="number"
              min={1}
              required
              value={newSeats}
              onChange={(e) => setNewSeats(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-24 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        {STATUS_CYCLE.map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 border font-medium capitalize ${STATUS_COLORS[s]}`}
          >
            {s}
          </span>
        ))}
        <span className="text-gray-400 self-center">
          — Click a table card to cycle its status
        </span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : tables.length === 0 ? (
        <p className="text-gray-400 text-sm">No tables yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer hover:shadow-md transition-shadow relative ${
                table.status === "free"
                  ? "border-green-200"
                  : table.status === "occupied"
                    ? "border-red-200"
                    : "border-yellow-200"
              }`}
              onClick={() => cycleStatus(table)}
            >
              <div className="text-2xl font-bold text-gray-800 text-center mb-1">
                {table.tableNumber}
              </div>
              <div className="text-xs text-gray-500 text-center mb-3">
                {table.seats} seats
              </div>
              <div
                className={`rounded-full px-2 py-0.5 text-xs font-medium text-center capitalize border ${STATUS_COLORS[table.status]}`}
              >
                {table.status}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(table.id);
                }}
                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
