"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Order, Expense } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Download,
  ChevronDown,
  RefreshCw,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import Pagination from "@/components/admin/Pagination";

// ─── helpers ─────────────────────────────────────────────────────────────────

type Range = "today" | "7d" | "30d" | "90d" | "custom";

function rangeLabel(r: Range) {
  return {
    today: "Today",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    custom: "Custom",
  }[r]!;
}

function rangeStart(r: Range, customFrom?: string): Date {
  if (r === "custom" && customFrom) return new Date(customFrom + "T00:00:00");
  const now = new Date();
  if (r === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    return s;
  }
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  const s = new Date(now);
  s.setDate(now.getDate() - (days - 1));
  s.setHours(0, 0, 0, 0);
  return s;
}

function rangeEnd(r: Range, customTo?: string): Date {
  if (r === "custom" && customTo) return new Date(customTo + "T23:59:59.999");
  const e = new Date();
  e.setHours(23, 59, 59, 999);
  return e;
}

function toDate(ts: Timestamp | undefined): Date | null {
  return ts ? ts.toDate() : null;
}

function dayKey(d: Date) {
  // Use local date components — toISOString() is UTC and shifts the day in
  // UTC+N timezones, causing afternoon orders to land on the wrong key.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD (local)
}

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(rows: DayRow[]) {
  const header = ["Date", "Revenue", "Expenses", "Net Profit", "Orders"].join(
    ",",
  );
  const lines = rows.map((r) =>
    [
      r.day,
      r.revenue.toFixed(2),
      r.expenses.toFixed(2),
      r.profit.toFixed(2),
      r.orderCount,
    ].join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── types ────────────────────────────────────────────────────────────────────

interface DayRow {
  day: string; // YYYY-MM-DD
  revenue: number;
  expenses: number;
  profit: number;
  orderCount: number;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  walkin: "Walk-in",
  delivery: "Delivery",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  scan: "Scan QR",
  online: "Online",
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { fmt } = useCurrency();
  const [range, setRange] = useState<Range>("30d");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"summary" | "orders" | "expenses">("summary");

  const load = useCallback(async () => {
    setLoading(true);
    const start = rangeStart(range, customFrom);
    const end = rangeEnd(range, customTo);

    const [ordersSnap, expensesSnap] = await Promise.all([
      // where-only query — no composite index needed; sort client-side
      getDocs(
        query(collection(db, "orders"), where("paymentStatus", "==", "paid")),
      ),
      getDocs(query(collection(db, "expenses"), orderBy("date", "desc"))),
    ]);

    const allOrders = ordersSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Order,
    );
    const allExpenses = expensesSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Expense,
    );

    // Filter by date range client-side and sort
    setOrders(
      allOrders
        .filter((o) => {
          const d = toDate(o.createdAt as Timestamp);
          return d ? d >= start && d <= end : false;
        })
        .sort(
          (a, b) =>
            (toDate(b.createdAt as Timestamp)?.getTime() ?? 0) -
            (toDate(a.createdAt as Timestamp)?.getTime() ?? 0),
        ),
    );
    setExpenses(
      allExpenses
        .filter((e) => {
          const d = toDate(e.date as Timestamp);
          return d ? d >= start && d <= end : false;
        })
        .sort(
          (a, b) =>
            (toDate(b.date as Timestamp)?.getTime() ?? 0) -
            (toDate(a.date as Timestamp)?.getTime() ?? 0),
        ),
    );
    setLoading(false);
  }, [range, customFrom, customTo]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── aggregate ──
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Build day-by-day map
  const dayMap: Record<string, DayRow> = {};

  // Populate all days in range
  const start = rangeStart(range, customFrom);
  const end = rangeEnd(range, customTo);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(new Date(d));
    dayMap[k] = { day: k, revenue: 0, expenses: 0, profit: 0, orderCount: 0 };
  }

  orders.forEach((o) => {
    const d = toDate(o.createdAt as Timestamp);
    if (!d) return;
    const k = dayKey(d);
    if (dayMap[k]) {
      dayMap[k].revenue += o.total;
      dayMap[k].orderCount += 1;
    }
  });

  expenses.forEach((e) => {
    const d = toDate(e.date as Timestamp);
    if (!d) return;
    const k = dayKey(d);
    if (dayMap[k]) {
      dayMap[k].expenses += e.amount;
    }
  });

  const dayRows: DayRow[] = Object.values(dayMap)
    .map((r) => ({ ...r, profit: r.revenue - r.expenses }))
    .sort((a, b) => b.day.localeCompare(a.day));

  // Key used to remount tab components when the filter changes, resetting page
  const filterKey = `${range}-${customFrom}-${customTo}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transaction Report</h1>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="relative">
            <select
              title="Range"
              value={range}
              onChange={(e) => setRange(e.target.value as Range)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
            >
              {(["today", "7d", "30d", "90d", "custom"] as Range[]).map((r) => (
                <option key={r} value={r}>
                  {rangeLabel(r)}
                </option>
              ))}
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
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-gray-400 text-sm select-none">–</span>
              <div className="relative flex items-center">
                <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  title="To"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </>
          )}
          <button
            onClick={load}
            className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-500"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportCSV(dayRows)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-sm font-medium text-gray-600"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<TrendingUp />}
          label="Revenue"
          value={fmt(totalRevenue)}
          sub={`${orders.length} paid orders`}
          color="green"
        />
        <KPICard
          icon={<TrendingDown />}
          label="Expenses"
          value={fmt(totalExpenses)}
          sub={`${expenses.length} entries`}
          color="red"
        />
        <KPICard
          icon={<DollarSign />}
          label="Net Profit"
          value={fmt(netProfit)}
          sub={netProfit >= 0 ? "Positive" : "Negative"}
          color={netProfit >= 0 ? "amber" : "red"}
        />
        <KPICard
          icon={<ShoppingBag />}
          label="Orders"
          value={String(orders.length)}
          sub={rangeLabel(range)}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit mb-5">
        {(["summary", "orders", "expenses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-amber-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : tab === "summary" ? (
        <SummaryTab key={filterKey} rows={dayRows} fmt={fmt} />
      ) : tab === "orders" ? (
        <OrdersTab key={filterKey} orders={orders} fmt={fmt} />
      ) : (
        <ExpensesTab key={filterKey} expenses={expenses} fmt={fmt} />
      )}
    </div>
  );
}

// ─── Summary tab ──────────────────────────────────────────────────────────────

const PAGE_SIZE_SUMMARY = 15;
const PAGE_SIZE_ORDERS = 20;
const PAGE_SIZE_EXPENSES = 20;

function SummaryTab({
  rows,
  fmt,
}: {
  rows: DayRow[];
  fmt: (n: number) => string;
}) {
  const [page, setPage] = useState(1);

  if (rows.length === 0)
    return (
      <p className="text-sm text-gray-400 bg-white rounded-xl p-6 shadow-sm">
        No data.
      </p>
    );

  const paged = rows.slice(
    (page - 1) * PAGE_SIZE_SUMMARY,
    page * PAGE_SIZE_SUMMARY,
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Date
            </th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">
              Orders
            </th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">
              Revenue
            </th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">
              Expenses
            </th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">
              Net Profit
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((r) => (
            <tr
              key={r.day}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-gray-700 font-medium">
                {fmtDay(r.day)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {r.orderCount}
              </td>
              <td className="px-4 py-3 text-right font-medium text-green-600">
                {r.revenue > 0 ? (
                  fmt(r.revenue)
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium text-red-500">
                {r.expenses > 0 ? (
                  fmt(r.expenses)
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold">
                <span
                  className={r.profit >= 0 ? "text-amber-600" : "text-red-600"}
                >
                  {fmt(r.profit)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50">
            <td
              colSpan={2}
              className="px-4 py-3 text-sm font-semibold text-gray-600"
            >
              Total ({rows.length} days)
            </td>
            <td className="px-4 py-3 text-right font-bold text-green-600">
              {fmt(rows.reduce((s, r) => s + r.revenue, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-red-500">
              {fmt(rows.reduce((s, r) => s + r.expenses, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold">
              {(() => {
                const p = rows.reduce((s, r) => s + r.profit, 0);
                return (
                  <span className={p >= 0 ? "text-amber-600" : "text-red-600"}>
                    {fmt(p)}
                  </span>
                );
              })()}
            </td>
          </tr>
        </tfoot>
      </table>
      <Pagination
        page={page}
        total={rows.length}
        pageSize={PAGE_SIZE_SUMMARY}
        onChange={setPage}
      />
    </div>
  );
}

// ─── Orders tab ───────────────────────────────────────────────────────────────

function OrdersTab({
  orders,
  fmt,
}: {
  orders: Order[];
  fmt: (n: number) => string;
}) {
  const [page, setPage] = useState(1);

  if (orders.length === 0)
    return (
      <p className="text-sm text-gray-400 bg-white rounded-xl p-6 shadow-sm">
        No paid orders.
      </p>
    );

  const paged = orders.slice(
    (page - 1) * PAGE_SIZE_ORDERS,
    page * PAGE_SIZE_ORDERS,
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Order
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Customer
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Type
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Method
            </th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">
              Date
            </th>
            <th className="text-right px-4 py-3 text-gray-500 font-medium">
              Amount
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {paged.map((o) => (
            <tr
              key={o.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 font-mono text-xs text-gray-600">
                #{o.id.slice(-6).toUpperCase()}
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {o.customerName}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.orderType === "walkin"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {ORDER_TYPE_LABELS[o.orderType] ?? o.orderType}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                {(o.createdAt as Timestamp)
                  ?.toDate()
                  .toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">
                {fmt(o.total)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50">
            <td
              colSpan={5}
              className="px-4 py-3 text-sm font-semibold text-gray-600"
            >
              Total ({orders.length} orders)
            </td>
            <td className="px-4 py-3 text-right font-bold text-green-600">
              {fmt(orders.reduce((s, o) => s + o.total, 0))}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <Pagination
        page={page}
        total={orders.length}
        pageSize={PAGE_SIZE_ORDERS}
        onChange={setPage}
      />
    </div>
  );
}

// ─── Expenses tab ─────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  ingredients: "bg-orange-100 text-orange-700",
  utilities: "bg-blue-100 text-blue-700",
  staff: "bg-purple-100 text-purple-700",
  rent: "bg-red-100 text-red-700",
  marketing: "bg-pink-100 text-pink-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-600",
};

function ExpensesTab({
  expenses,
  fmt,
}: {
  expenses: Expense[];
  fmt: (n: number) => string;
}) {
  const [page, setPage] = useState(1);

  if (expenses.length === 0)
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-sm text-gray-400 mb-2">
          No expenses for this period.
        </p>
        <Link
          href="/admin/expenses"
          className="text-sm text-amber-600 hover:underline font-medium"
        >
          Manage Expenses →
        </Link>
      </div>
    );

  const paged = expenses.slice(
    (page - 1) * PAGE_SIZE_EXPENSES,
    page * PAGE_SIZE_EXPENSES,
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
          </tr>
        </thead>
        <tbody>
          {paged.map((e) => (
            <tr
              key={e.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                {(e.date as Timestamp)?.toDate().toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {e.description}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CAT_COLORS[e.category] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {e.category}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {e.note || "—"}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-red-600">
                {fmt(e.amount)}
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
              Total ({expenses.length} entries)
            </td>
            <td className="px-4 py-3 text-right font-bold text-red-600">
              {fmt(expenses.reduce((s, e) => s + e.amount, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
      <Pagination
        page={page}
        total={expenses.length}
        pageSize={PAGE_SIZE_EXPENSES}
        onChange={setPage}
      />
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "green" | "red" | "amber" | "blue";
}) {
  const bg = {
    green: "bg-green-50 text-green-500",
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-500",
    blue: "bg-blue-50 text-blue-500",
  }[color];
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div className={`rounded-xl p-3 shrink-0 ${bg}`}>
        <div className="w-5 h-5 [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
        <p className="text-xs text-gray-400 truncate">{sub}</p>
      </div>
    </div>
  );
}
