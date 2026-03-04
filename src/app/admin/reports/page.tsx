"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Order, OrderItem } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, Package } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function toDateStr(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  return ts
    .toDate()
    .toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getHour(ts: Timestamp | null | undefined): number {
  if (!ts) return 0;
  return ts.toDate().getHours();
}

export default function ReportsPage() {
  const { fmt } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 30>(7);

  useEffect(() => {
    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))).then(
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
        setLoading(false);
      },
    );
  }, []);

  // Filter to last N days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const filtered = orders.filter(
    (o) =>
      (o.createdAt as Timestamp)?.toDate() >= cutoff &&
      o.paymentStatus === "paid",
  );

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
  const avgOrder = filtered.length ? totalRevenue / filtered.length : 0;

  // Top menu items
  const itemMap: Record<string, { name: string; count: number }> = {};
  filtered.forEach((o) =>
    o.items?.forEach((it: OrderItem) => {
      if (!itemMap[it.menuItemId])
        itemMap[it.menuItemId] = { name: it.name, count: 0 };
      itemMap[it.menuItemId].count += it.quantity;
    }),
  );
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const mostPopular = topItems[0]?.name ?? "—";

  // Daily revenue chart data
  const dailyMap: Record<string, number> = {};
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    ] = 0;
  }
  filtered.forEach((o) => {
    const key = toDateStr(o.createdAt as Timestamp);
    if (key in dailyMap) dailyMap[key] += o.total;
  });
  const dailyData = Object.entries(dailyMap).map(([date, revenue]) => ({
    date,
    revenue: +revenue.toFixed(2),
  }));

  // Orders per hour
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    orders: 0,
  }));
  filtered.forEach((o) => {
    hourly[getHour(o.createdAt as Timestamp)].orders++;
  });

  // Order type breakdown
  const typeMap: Record<string, number> = { delivery: 0, walkin: 0 };
  filtered.forEach((o) => {
    typeMap[o.orderType] = (typeMap[o.orderType] ?? 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({
    name,
    value,
  }));
  const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981"];

  // CSV export
  const exportCSV = () => {
    const rows = [["Order ID", "Date", "Customer", "Type", "Total", "Payment"]];
    filtered.forEach((o) =>
      rows.push([
        o.id,
        toDateStr(o.createdAt as Timestamp),
        o.customerName,
        o.orderType,
        o.total.toFixed(2),
        o.paymentStatus,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `orders-last-${range}-days.csv`;
    a.click();
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">
          Reports & Analytics
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md ${range === r ? "bg-white shadow text-gray-800" : "text-gray-500"}`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="px-3 py-2 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          icon={<DollarSign />}
          title={`Revenue (${range}d)`}
          value={`${fmt(totalRevenue)}`}
          color="amber"
        />
        <KPI
          icon={<ShoppingBag />}
          title="Paid Orders"
          value={String(filtered.length)}
          color="blue"
        />
        <KPI
          icon={<TrendingUp />}
          title="Avg Order Value"
          value={`${fmt(avgOrder)}`}
          color="green"
        />
        <KPI
          icon={<Package />}
          title="Most Popular Item"
          value={mostPopular}
          color="purple"
          small
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Daily Revenue
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${fmt(Number(v))}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Orders by Hour
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Order Types
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top items */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Top 10 Items
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Orders</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 text-gray-700">{item.name}</td>
                  <td className="py-1.5 text-right font-semibold text-gray-800">
                    {item.count}
                  </td>
                </tr>
              ))}
              {topItems.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="py-4 text-center text-gray-400 text-xs"
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({
  icon,
  title,
  value,
  color,
  small,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}
      >
        <span className="w-5 h-5">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{title}</p>
        <p
          className={`font-bold text-gray-800 truncate ${small ? "text-sm" : "text-xl"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
