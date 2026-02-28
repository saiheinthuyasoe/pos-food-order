"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", Timestamp.fromDate(start)),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const todayRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const activeDeliveries = orders.filter(
    (o) =>
      o.orderType === "delivery" &&
      !["delivered", "cancelled"].includes(o.status),
  ).length;

  const currentHour = new Date().getHours();
  const chartData = Array.from({ length: currentHour + 1 }, (_, h) => ({
    hour: `${h}:00`,
    orders: orders.filter((o) => o.createdAt?.toDate().getHours() === h).length,
  }));

  const walkinCount = orders.filter((o) => o.orderType === "walkin").length;
  const deliveryCount = orders.filter((o) => o.orderType === "delivery").length;
  const pieData = [
    { name: "Walk-in", value: walkinCount },
    { name: "Delivery", value: deliveryCount },
  ].filter((d) => d.value > 0);
  const PIE_COLORS = ["#f59e0b", "#3b82f6"];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-orange-100 text-orange-700",
    ready: "bg-green-100 text-green-700",
    out_for_delivery: "bg-purple-100 text-purple-700",
    delivered: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Orders"
          value={loading ? "…" : orders.length}
          sub="all statuses"
          color="amber"
          href="/admin/orders"
        />
        <KpiCard
          label="Today's Revenue"
          value={loading ? "…" : `$${todayRevenue.toFixed(2)}`}
          sub="paid orders"
          color="green"
          href="/admin/payments"
        />
        <KpiCard
          label="Pending Orders"
          value={loading ? "…" : pendingOrders}
          sub="awaiting confirmation"
          color="red"
          href="/admin/orders"
        />
        <KpiCard
          label="Active Deliveries"
          value={loading ? "…" : activeDeliveries}
          sub="in progress"
          color="blue"
          href="/admin/delivery"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Orders Feed */}
        <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Live Orders</h2>
            <Link
              href="/admin/orders"
              className="text-xs text-amber-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-400">No orders today yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      #{o.id.slice(-6).toUpperCase()} · {o.customerName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {o.orderType === "walkin" ? "Walk-in" : "Delivery"} ·{" "}
                      {o.items.length} item{o.items.length !== 1 && "s"} · $
                      {o.total.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[o.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Order Types</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Orders by Hour Today
        </h2>
        {chartData.every((d) => d.orders === 0) ? (
          <p className="text-sm text-gray-400">No orders yet today.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  href,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: "amber" | "green" | "red" | "blue";
  href: string;
}) {
  const colorMap = {
    amber: "border-l-amber-500",
    green: "border-l-green-500",
    red: "border-l-red-500",
    blue: "border-l-blue-500",
  };
  return (
    <Link
      href={href}
      className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${colorMap[color]} hover:shadow-md transition-shadow`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </Link>
  );
}
