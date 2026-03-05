"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, StaffMember } from "@/types";
import { Eye, Receipt, ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

type ActiveStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
};

const ACTIVE_STATUS_TABS: { value: ActiveStatus; label: string }[] = [
  { value: "all", label: "All Active" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
];

export default function DeliveryPage() {
  const { fmt } = useCurrency();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filters
  const [tab, setTab] = useState<"active" | "delivered">("active");
  const [statusFilter, setStatusFilter] = useState<ActiveStatus>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  useEffect(() => {
    // Active delivery orders (real-time)
    const q = query(
      collection(db, "orders"),
      where("orderType", "==", "delivery"),
      where("status", "not-in", ["awaiting_payment", "delivered", "cancelled"]),
      orderBy("status"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveOrders(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order),
      );
      setLoading(false);
    });

    // Delivery staff list
    getDocs(
      query(
        collection(db, "admins"),
        where("role", "==", "delivery"),
        where("active", "==", true),
      ),
    ).then((snap) =>
      setDeliveryStaff(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffMember),
      ),
    );

    return () => unsub();
  }, []);

  // Load delivered orders when switching to history tab
  useEffect(() => {
    if (tab !== "delivered" || deliveredOrders.length > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistoryLoading(true);
    getDocs(
      query(
        collection(db, "orders"),
        where("orderType", "==", "delivery"),
        where("status", "==", "delivered"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    ).then((snap) => {
      setDeliveredOrders(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order),
      );
      setHistoryLoading(false);
    });
  }, [tab, deliveredOrders.length]);

  const assignStaff = async (
    orderId: string,
    staffId: string,
    staffName: string,
  ) => {
    await updateDoc(doc(db, "orders", orderId), {
      assignedDeliveryStaffId: staffId,
      assignedDeliveryStaffName: staffName,
    });
  };

  // Apply filters to active orders
  const filteredActive = activeOrders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (staffFilter === "unassigned" && o.assignedDeliveryStaffId) return false;
    if (
      staffFilter !== "all" &&
      staffFilter !== "unassigned" &&
      o.assignedDeliveryStaffId !== staffFilter
    )
      return false;
    return true;
  });

  // Apply staff filter to delivered orders
  const filteredDelivered = deliveredOrders.filter((o) => {
    if (staffFilter === "unassigned" && o.assignedDeliveryStaffId) return false;
    if (
      staffFilter !== "all" &&
      staffFilter !== "unassigned" &&
      o.assignedDeliveryStaffId !== staffFilter
    )
      return false;
    return true;
  });

  const displayOrders = tab === "active" ? filteredActive : filteredDelivered;
  const isLoading = tab === "active" ? loading : historyLoading;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Delivery</h1>
        <div className="flex items-center gap-2">
          {/* Staff filter */}
          <div className="relative">
            <select
              title="Filter by staff"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Staff</option>
              <option value="unassigned">Unassigned</option>
              {deliveryStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-medium">
            {activeOrders.length} active
          </span>
        </div>
      </div>

      {/* Tab + Status filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Active / Delivered tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "active" ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Active
          </button>
          <button
            onClick={() => setTab("delivered")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "delivered" ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Delivered
          </button>
        </div>

        {/* Status filter — only for active tab */}
        {tab === "active" && (
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 overflow-x-auto max-w-full">
            {ACTIVE_STATUS_TABS.map(({ value, label }) => {
              const count =
                value === "all"
                  ? activeOrders.length
                  : activeOrders.filter((o) => o.status === value).length;
              return (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === value ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${statusFilter === value ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-gray-400 text-sm">Loading…</p>
        ) : displayOrders.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">
            {tab === "active"
              ? "No active delivery orders."
              : "No delivered orders found."}
          </p>
        ) : (
          <>
            {/* ── Mobile card list ── */}
            <div className="md:hidden divide-y divide-gray-100">
              {displayOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2.5">
                  {/* Order # · Status · View */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-gray-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center gap-0.5 text-xs text-amber-600 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </div>
                  </div>
                  {/* Customer */}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {order.customerName}
                    </p>
                    {order.customerPhone && (
                      <p className="text-xs text-gray-400">
                        {order.customerPhone}
                      </p>
                    )}
                  </div>
                  {/* Address */}
                  {order.deliveryAddress && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      📍 {order.deliveryAddress}
                    </p>
                  )}
                  {/* Assign staff + Total */}
                  <div className="flex items-center justify-between gap-3">
                    {tab === "active" ? (
                      <select
                        title="Assign Delivery Staff"
                        value={order.assignedDeliveryStaffId ?? ""}
                        onChange={(e) => {
                          const staff = deliveryStaff.find(
                            (s) => s.id === e.target.value,
                          );
                          if (staff)
                            assignStaff(order.id, staff.id, staff.name);
                        }}
                        className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {deliveryStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {order.assignedDeliveryStaffName ?? "—"}
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-800 shrink-0">
                      {fmt(order.total)}
                    </span>
                  </div>
                  {/* Payment slip */}
                  {order.paymentMethod === "scan" &&
                    (order.paymentReceiptUrl ? (
                      <a
                        href={order.paymentReceiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-green-600 font-medium"
                      >
                        <Receipt className="w-4 h-4" /> View Payment Slip
                      </a>
                    ) : (
                      <p className="text-xs text-yellow-600">
                        ⏳ Awaiting payment slip
                      </p>
                    ))}
                </div>
              ))}
            </div>
            {/* ── Desktop table ── */}
            <table className="hidden md:table w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Order
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Address
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Assigned To
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Payment Slip
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.customerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-40 truncate">
                      {order.deliveryAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {tab === "active" ? (
                        <select
                          title="Assign Delivery Staff"
                          value={order.assignedDeliveryStaffId ?? ""}
                          onChange={(e) => {
                            const staff = deliveryStaff.find(
                              (s) => s.id === e.target.value,
                            );
                            if (staff)
                              assignStaff(order.id, staff.id, staff.name);
                          }}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {deliveryStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {order.assignedDeliveryStaffName ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {fmt(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      {order.paymentMethod === "scan" ? (
                        order.paymentReceiptUrl ? (
                          <a
                            href={order.paymentReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            <Receipt className="w-3.5 h-3.5" /> View Slip
                          </a>
                        ) : (
                          <span className="text-xs text-yellow-600">
                            ⏳ Awaiting slip
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
