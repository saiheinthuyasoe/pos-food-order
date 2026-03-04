"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Expense, ExpenseCategory } from "@/types";
import {
  Plus,
  Trash2,
  X,
  Receipt,
  TrendingDown,
  CalendarDays,
  ChevronDown,
  Calendar,
} from "lucide-react";
import Pagination from "@/components/admin/Pagination";

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  {
    value: "ingredients",
    label: "Ingredients",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "utilities",
    label: "Utilities",
    color: "bg-blue-100 text-blue-700",
  },
  { value: "staff", label: "Staff", color: "bg-purple-100 text-purple-700" },
  { value: "rent", label: "Rent", color: "bg-red-100 text-red-700" },
  {
    value: "marketing",
    label: "Marketing",
    color: "bg-pink-100 text-pink-700",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    color: "bg-yellow-100 text-yellow-700",
  },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-600" },
];

const catColor = (c: ExpenseCategory) =>
  CATEGORIES.find((x) => x.value === c)?.color ?? "bg-gray-100 text-gray-600";
const catLabel = (c: ExpenseCategory) =>
  CATEGORIES.find((x) => x.value === c)?.label ?? c;

const toMs = (t: Timestamp | undefined) => t?.toMillis() ?? 0;

type Range = "today" | "week" | "month" | "all" | "custom";

function rangeLabel(r: Range) {
  return {
    today: "Today",
    week: "This Week",
    month: "This Month",
    all: "All Time",
    custom: "Custom",
  }[r]!;
}

function inRange(
  ts: Timestamp | undefined,
  range: Range,
  customFrom?: string,
  customTo?: string,
): boolean {
  if (!ts) return false;
  const d = ts.toDate();
  const now = new Date();
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (range === "month") {
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }
  if (range === "custom") {
    const from = customFrom ? new Date(customFrom + "T00:00:00") : new Date(0);
    const to = customTo ? new Date(customTo + "T23:59:59.999") : new Date();
    return d >= from && d <= to;
  }
  return true;
}

function formatDate(ts: Timestamp | undefined) {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const EMPTY_FORM = {
  description: "",
  amount: "",
  category: "ingredients" as ExpenseCategory,
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [catFilter, setCatFilter] = useState<ExpenseCategory | "all">("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    return onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense));
      setLoading(false);
    });
  }, []);

  const visible = expenses.filter(
    (e) =>
      inRange(e.date as Timestamp, range, customFrom, customTo) &&
      (catFilter === "all" || e.category === catFilter),
  );

  const sortedVisible = visible
    .slice()
    .sort((a, b) => toMs(b.date as Timestamp) - toMs(a.date as Timestamp));

  const PAGE_SIZE = 20;
  // Reset page when filters change
  const resetPage = () => setPage(1);
  const pagedVisible = sortedVisible.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const totalVisible = visible.reduce((s, e) => s + e.amount, 0);

  // KPI: all time, this month, today
  const allTime = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses
    .filter((e) => inRange(e.date as Timestamp, "month"))
    .reduce((s, e) => s + e.amount, 0);
  const today = expenses
    .filter((e) => inRange(e.date as Timestamp, "today"))
    .reduce((s, e) => s + e.amount, 0);

  // Per-category totals for visible set
  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  visible.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  });

  const handleAdd = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.description || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const dateTs = Timestamp.fromDate(new Date(form.date));
      await addDoc(collection(db, "expenses"), {
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        date: dateTs,
        note: form.note.trim(),
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? "",
      });
      setForm(EMPTY_FORM);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "expenses", id));
    setDeleteId(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          icon={<CalendarDays />}
          label="Today"
          value={fmt(today)}
          color="blue"
        />
        <KPI
          icon={<TrendingDown />}
          label="This Month"
          value={fmt(thisMonth)}
          color="red"
        />
        <KPI
          icon={<Receipt />}
          label="All Time"
          value={fmt(allTime)}
          color="gray"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Range */}
        <div className="relative">
          <select
            title="Range"
            value={range}
            onChange={(e) => {
              setRange(e.target.value as Range);
              resetPage();
            }}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
          >
            {(["today", "week", "month", "all", "custom"] as Range[]).map(
              (r) => (
                <option key={r} value={r}>
                  {rangeLabel(r)}
                </option>
              ),
            )}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {range === "custom" && (
          <>
            <div className="relative flex items-center">
              <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                title="From"
                value={customFrom}
                max={customTo}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  resetPage();
                }}
                className="pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <span className="text-gray-400 text-sm self-center select-none">
              –
            </span>
            <div className="relative flex items-center">
              <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                title="To"
                value={customTo}
                min={customFrom}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  resetPage();
                }}
                className="pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </>
        )}

        {/* Category */}
        <div className="relative">
          <select
            title="Category Filter"
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value as ExpenseCategory | "all");
              resetPage();
            }}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {visible.length > 0 && (
          <div className="ml-auto flex items-center text-sm text-gray-500">
            <span className="font-semibold text-gray-800 mr-1">
              {visible.length}
            </span>{" "}
            expenses ·
            <span className="font-semibold text-red-600 ml-1">
              {fmt(totalVisible)}
            </span>
          </div>
        )}
      </div>

      {/* Category breakdown chips */}
      {Object.keys(byCategory).length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.filter((c) => byCategory[c.value]).map((c) => (
            <span
              key={c.value}
              className={`rounded-full px-3 py-1 text-xs font-medium ${c.color}`}
            >
              {c.label}: {fmt(byCategory[c.value] ?? 0)}
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No expenses found.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Note
                  </th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">
                    Amount
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pagedVisible.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(e.date as Timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {e.description}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${catColor(e.category)}`}
                      >
                        {catLabel(e.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-40 truncate">
                      {e.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {fmt(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteId(e.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-sm font-semibold text-gray-600"
                  >
                    Total ({rangeLabel(range)}
                    {catFilter !== "all" ? ` · ${catLabel(catFilter)}` : ""})
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {fmt(totalVisible)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <Pagination
              page={page}
              total={sortedVisible.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Add Expense</h2>
              <button
                title="Close Add Expense Form"
                onClick={() => {
                  setModalOpen(false);
                  setForm(EMPTY_FORM);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form ref={formRef} onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description *
                </label>
                <input
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="e.g. Weekly vegetable supply"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Amount *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Date *
                  </label>
                  <input
                    title="Select Date"
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Category *
                </label>
                <select
                  title="Category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Note
                </label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              Delete Expense?
            </h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "red" | "green" | "gray";
}) {
  const bg = {
    blue: "bg-blue-50 text-blue-500",
    red: "bg-red-50 text-red-500",
    green: "bg-green-50 text-green-500",
    gray: "bg-gray-100 text-gray-500",
  }[color];
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${bg}`}>
        <div className="w-5 h-5 [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
