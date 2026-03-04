"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Order, PaymentStatus } from "@/types";
import { DollarSign, TrendingUp, Calendar, RotateCcw, X } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-500",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  scan: "Scan QR",
  online: "Online",
};

export default function PaymentsPage() {
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>(
    "all",
  );
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))).then(
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
        setLoading(false);
      },
    );
  }, []);

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await updateDoc(doc(db, "orders", refundTarget.id), {
        paymentStatus: "refunded",
        refundNote: refundNote.trim() || null,
        refundedAt: serverTimestamp(),
        refundedBy: user?.uid ?? "",
        statusHistory: [
          ...(refundTarget.statusHistory ?? []),
          {
            status: "refunded",
            timestamp: new Date(),
            updatedBy: user?.uid ?? "",
          },
        ],
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === refundTarget.id ? { ...o, paymentStatus: "refunded" } : o,
        ),
      );
      setRefundTarget(null);
      setRefundNote("");
    } finally {
      setRefunding(false);
    }
  };

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const refundedOrders = orders.filter((o) => o.paymentStatus === "refunded");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalRefunded = refundedOrders.reduce((s, o) => s + o.total, 0);

  const todayStr = new Date().toDateString();
  const todayRevenue = paidOrders
    .filter(
      (o) => (o.createdAt as Timestamp)?.toDate().toDateString() === todayStr,
    )
    .reduce((s, o) => s + o.total, 0);

  const filtered =
    filterStatus === "all"
      ? orders
      : orders.filter((o) => o.paymentStatus === filterStatus);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Payments</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<DollarSign />}
          title="Total Revenue"
          value={fmt(totalRevenue)}
          color="amber"
        />
        <KPICard
          icon={<Calendar />}
          title="Today's Revenue"
          value={fmt(todayRevenue)}
          color="green"
        />
        <KPICard
          icon={<TrendingUp />}
          title="Paid Orders"
          value={String(paidOrders.length)}
          color="blue"
        />
        <KPICard
          icon={<RotateCcw />}
          title="Total Refunded"
          value={fmt(totalRefunded)}
          sub={`${refundedOrders.length} refund${refundedOrders.length !== 1 ? "s" : ""}`}
          color="red"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
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
              {s !== "all" && (
                <span className="ml-1 opacity-60">
                  ({orders.filter((o) => o.paymentStatus === s).length})
                </span>
              )}
            </button>
          ),
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-400">Loadingâ€¦</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No payments found.</p>
        ) : (
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
                  Date
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Method
                </th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Payment
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Order Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    #{o.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {o.customerName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {(o.createdAt as Timestamp)
                      ?.toDate()
                      .toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {fmt(o.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[o.paymentStatus]}`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {o.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        View
                      </Link>
                      {o.paymentStatus === "paid" && (
                        <button
                          onClick={() => {
                            setRefundTarget(o);
                            setRefundNote("");
                          }}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                          title="Issue Refund"
                        >
                          <RotateCcw className="w-3 h-3" /> Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Issue Refund</h2>
              <button
                onClick={() => setRefundTarget(null)}
                title="Close"
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order</span>
                <span className="font-mono text-gray-700">
                  #{refundTarget.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium text-gray-700">
                  {refundTarget.customerName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="text-gray-700">
                  {METHOD_LABELS[refundTarget.paymentMethod] ??
                    refundTarget.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-500 font-medium">Refund Amount</span>
                <span className="font-bold text-red-600 text-base">
                  {fmt(refundTarget.total)}
                </span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Refund Note{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="e.g. Customer requested cancellation"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <p className="text-xs text-gray-400 mb-4">
              This marks payment as <strong>refunded</strong>. The actual funds
              transfer must be handled separately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {refunding ? "Processing…" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon,
  title,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-500",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}
      >
        <span className="w-5 h-5 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
