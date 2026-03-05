"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus, NotificationSettings } from "@/types";
import { Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { playNotificationSound } from "@/lib/notificationSound";

const NOTIF_DEFAULTS: NotificationSettings = {
  soundEnabled: true,
  volume: 70,
  soundType: "ding",
  newOrderAlert: true,
  readyAlert: false,
};

const ALL_TABS: {
  label: string;
  value: OrderStatus | "all";
  roles: string[];
}[] = [
  { label: "All", value: "all", roles: ["super_admin", "kitchen", "delivery"] },
  { label: "Pending", value: "pending", roles: ["super_admin", "kitchen"] },
  { label: "Confirmed", value: "confirmed", roles: ["super_admin", "kitchen"] },
  { label: "Preparing", value: "preparing", roles: ["super_admin", "kitchen"] },
  {
    label: "Ready",
    value: "ready",
    roles: ["super_admin", "kitchen", "delivery"],
  },
  {
    label: "Out for Delivery",
    value: "out_for_delivery",
    roles: ["super_admin", "delivery"],
  },
  {
    label: "Delivered",
    value: "delivered",
    roles: ["super_admin", "delivery"],
  },
  {
    label: "Cancelled",
    value: "cancelled",
    roles: ["super_admin", "delivery"],
  },
];

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const { adminRole } = useAuth();
  const { fmt } = useCurrency();

  // Track known order IDs and their statuses to detect new/changed orders
  const knownOrders = useRef<Map<string, OrderStatus>>(new Map());
  const initialized = useRef(false);
  const notifSettings = useRef<NotificationSettings>(NOTIF_DEFAULTS);

  // Fetch notification settings once
  useEffect(() => {
    getDoc(doc(db, "settings", "notifications")).then((snap) => {
      if (snap.exists())
        notifSettings.current = {
          ...NOTIF_DEFAULTS,
          ...snap.data(),
        } as NotificationSettings;
    });
  }, []);

  const TABS = ALL_TABS.filter((t) =>
    adminRole ? t.roles.includes(adminRole) : true,
  );

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const incoming = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Order,
      );

      if (!initialized.current) {
        // First load — populate known orders silently
        incoming.forEach((o) => knownOrders.current.set(o.id, o.status));
        initialized.current = true;
      } else {
        const ns = notifSettings.current;
        if (ns.soundEnabled) {
          const soundOpts = { volume: ns.volume, type: ns.soundType };
          for (const order of incoming) {
            const prevStatus = knownOrders.current.get(order.id);
            const isNew = prevStatus === undefined;

            // New non-scan order arriving as pending
            if (isNew && order.status === "pending" && ns.newOrderAlert) {
              playNotificationSound(soundOpts);
              break;
            }
            // Scan/delivery order: customer just uploaded receipt → now visible
            if (
              !isNew &&
              prevStatus === "awaiting_payment" &&
              order.status === "pending" &&
              ns.newOrderAlert
            ) {
              playNotificationSound(soundOpts);
              break;
            }
            if (
              !isNew &&
              prevStatus !== "ready" &&
              order.status === "ready" &&
              ns.readyAlert
            ) {
              playNotificationSound(soundOpts);
              break;
            }
          }
        }
        incoming.forEach((o) => knownOrders.current.set(o.id, o.status));
      }

      // Hide awaiting_payment orders — they haven't paid yet
      setOrders(incoming.filter((o) => o.status !== "awaiting_payment"));
      setLoading(false);
    });
  }, []);

  const handleTabChange = (newTab: OrderStatus | "all") => {
    setTab(newTab);
    setPage(0);
  };

  const filtered =
    tab === "all" ? orders : orders.filter((o) => o.status === tab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const countFor = (status: OrderStatus | "all") =>
    status === "all"
      ? orders.length
      : orders.filter((o) => o.status === status).length;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Orders</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-5 bg-white rounded-xl shadow-sm p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.value
                ? "bg-amber-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t.label}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${tab === t.value ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-500"}`}
            >
              {countFor(t.value)}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">
            Connecting to real-time feed…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">
            No orders in this category.
          </p>
        ) : (
          <>
            {/* ── Mobile card list ── */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginated.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Row 1: # · Type · Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-500">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          order.orderType === "walkin"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.orderType === "walkin" ? "Walk-in" : "Delivery"}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  {/* Row 2: Customer + time */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.createdAt
                        ?.toDate()
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </p>
                  </div>
                  {/* Row 3: Items */}
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {order.items
                      .map((i) => `${i.name} x${i.quantity}`)
                      .join(", ")}
                  </p>
                  {/* Row 4: Total */}
                  <p className="text-sm font-bold text-gray-800 mt-1.5">
                    {fmt(order.total)}
                  </p>
                </Link>
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
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Items
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Time
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${order.orderType === "walkin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {order.orderType === "walkin" ? "Walk-in" : "Delivery"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-48 truncate">
                      {order.items
                        .map((i) => `${i.name} x${i.quantity}`)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {fmt(order.total)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {order.createdAt?.toDate().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
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

        {/* Pagination footer */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
