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
import { Order, PaymentStatus } from "@/types";
import { DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>(
    "all",
  );

  useEffect(() => {
    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))).then(
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
        setLoading(false);
      },
    );
  }, []);

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);

  const todayStr = new Date().toDateString();
  const todayRevenue = paidOrders
    .filter(
      (o) => (o.createdAt as Timestamp)?.toDate().toDateString() === todayStr,
    )
    .reduce((s, o) => s + o.total, 0);

  const methodCounts: Record<string, number> = {};
  paidOrders.forEach((o) => {
    methodCounts[o.paymentMethod] = (methodCounts[o.paymentMethod] ?? 0) + 1;
  });

  const filtered =
    filterStatus === "all"
      ? orders
      : orders.filter((o) => o.paymentStatus === filterStatus);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Payments</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<DollarSign />}
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          color="amber"
        />
        <KPICard
          icon={<Calendar />}
          title="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          color="green"
        />
        <KPICard
          icon={<TrendingUp />}
          title="Paid Orders"
          value={String(paidOrders.length)}
          color="blue"
        />
        <KPICard
          icon={<CreditCard />}
          title="Avg Order Value"
          value={
            paidOrders.length
              ? `$${(totalRevenue / paidOrders.length).toFixed(2)}`
              : "$0.00"
          }
          color="purple"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "paid", "pending", "failed", "refunded"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                filterStatus === s
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ),
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No payments found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {[
                  "Order ID",
                  "Customer",
                  "Date",
                  "Method",
                  "Amount",
                  "Payment Status",
                  "Order Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-gray-500 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {o.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-800">{o.customerName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {(o.createdAt as Timestamp)?.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {o.paymentMethod}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    ${o.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[o.paymentStatus]}`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {o.status}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      View
                    </Link>
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

function KPICard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}
      >
        <span className="w-5 h-5">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
