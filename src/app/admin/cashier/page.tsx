"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, PaymentMethod, RestaurantSettings } from "@/types";
import { printTableReceipt } from "@/lib/printReceipt";
import {
  Wallet,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle,
  Clock,
  X,
  Printer,
} from "lucide-react";

const METHOD_OPTIONS: {
  method: PaymentMethod;
  label: string;
  icon: React.ElementType;
}[] = [
  { method: "cash", label: "Cash", icon: Banknote },
  { method: "card", label: "Card", icon: CreditCard },
  { method: "scan", label: "Scan QR", icon: QrCode },
];

export default function CashierPage() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [paidToday, setPaidToday] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Restaurant settings for receipts
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  // Payment modal state — collectingOrders holds 1+ orders (grouped by table)
  const [collectingOrders, setCollectingOrders] = useState<Order[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch restaurant settings once
  useEffect(() => {
    getDoc(doc(db, "settings", "restaurant")).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as RestaurantSettings);
    });
  }, []);

  // Real-time: pending walk-in payments
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "orders"), where("paymentStatus", "==", "pending")),
      (snap) => {
        const walkinPending = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Order)
          .filter((o) => o.orderType === "walkin")
          .sort(
            (a, b) =>
              ((a.createdAt as Timestamp)?.toMillis() ?? 0) -
              ((b.createdAt as Timestamp)?.toMillis() ?? 0),
          );
        setPendingOrders(walkinPending);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // Real-time: today's collected walk-in payments
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "orders"), where("paymentStatus", "==", "paid")),
      (snap) => {
        const todayStr = new Date().toDateString();
        const todayPaid = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Order)
          .filter((o) => {
            if (o.orderType !== "walkin") return false;
            const ts =
              (o.paidAt as Timestamp | undefined) ?? (o.createdAt as Timestamp);
            return ts?.toDate().toDateString() === todayStr;
          })
          .sort(
            (a, b) =>
              ((b.paidAt as Timestamp | undefined)?.toMillis() ??
                (b.createdAt as Timestamp)?.toMillis() ??
                0) -
              ((a.paidAt as Timestamp | undefined)?.toMillis() ??
                (a.createdAt as Timestamp)?.toMillis() ??
                0),
          );
        setPaidToday(todayPaid);
      },
    );
    return () => unsub();
  }, []);

  const receiptSettings = {
    restaurantName: settings?.name ?? "FoodOrder",
    address: settings?.address,
    phone: settings?.phone,
  };

  const handlePrint = (orders: Order[]) => {
    printTableReceipt(orders, receiptSettings);
  };

  const openCollect = (orders: Order[]) => {
    setCollectingOrders(orders);
    setSelectedMethod("cash");
  };

  const confirmPayment = async () => {
    if (collectingOrders.length === 0) return;
    setProcessingPayment(true);
    const taxRate = (settings?.taxRate ?? 0) / 100;
    try {
      const updatedOrders: Order[] = await Promise.all(
        collectingOrders.map(async (o) => {
          const taxableBase = o.subtotal - o.discount + o.deliveryFee;
          const tax = parseFloat((taxableBase * taxRate).toFixed(2));
          const total = parseFloat((taxableBase + tax).toFixed(2));
          await updateDoc(doc(db, "orders", o.id), {
            paymentMethod: selectedMethod,
            paymentStatus: "paid",
            paidAt: serverTimestamp(),
            tax,
            total,
          });
          return {
            ...o,
            paymentMethod: selectedMethod,
            paymentStatus: "paid" as const,
            tax,
            total,
          };
        }),
      );
      // Print combined receipt with final tax-inclusive totals
      handlePrint(updatedOrders);
      setCollectingOrders([]);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Group pending orders by table number (orders without tableNumber are individual)
  const tableGroups: { key: string; label: string; orders: Order[] }[] = [];
  const grouped = new Map<string, Order[]>();
  for (const order of pendingOrders) {
    const key =
      order.tableNumber != null ? `table-${order.tableNumber}` : `solo-${order.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(order);
  }
  for (const [key, orders] of grouped) {
    const label =
      orders[0].tableNumber != null
        ? `Table ${orders[0].tableNumber}`
        : `#${orders[0].id.slice(-6).toUpperCase()}`;
    tableGroups.push({ key, label, orders });
  }

  const todayRevenue = paidToday.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-800">Cashier</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending Payments"
          value={String(tableGroups.length)}
          color="amber"
        />
        <StatCard
          label="Collected Today"
          value={String(paidToday.length)}
          color="green"
        />
        <StatCard
          label="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          color="blue"
        />
      </div>

      {/* Pending payments */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pending Payments
        </h2>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : pendingOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="font-medium text-gray-600">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No pending payments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tableGroups.map(({ key, label, orders }) => {
              const allItems = orders.flatMap((o) => o.items);
              const groupTotal = orders.reduce((s, o) => s + o.total, 0);
              const hasMultiple = orders.length > 1;
              return (
                <div
                  key={key}
                  className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {label}
                      </span>
                      {hasMultiple && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {orders.length} orders
                        </span>
                      )}
                      {!hasMultiple && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                            orders[0].status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : orders[0].status === "ready"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {orders[0].status.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {orders[0].customerName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {allItems
                        .slice(0, 3)
                        .map((i) => `${i.name} ×${i.quantity}`)
                        .join(", ")}
                      {allItems.length > 3 && ` +${allItems.length - 3} more`}
                    </p>
                    {hasMultiple && (
                      <div className="mt-1.5 space-y-0.5">
                        {orders.map((o) => (
                          <p key={o.id} className="text-xs text-gray-400 flex items-center gap-1">
                            <span className="font-mono text-gray-300">#{o.id.slice(-6).toUpperCase()}</span>
                            <span>${o.total.toFixed(2)}</span>
                            <span
                              className={`ml-1 px-1.5 py-0 rounded-full ${
                                o.status === "delivered"
                                  ? "bg-green-100 text-green-700"
                                  : o.status === "ready"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {o.status.replace("_", " ")}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    {!hasMultiple && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(orders[0].createdAt as Timestamp)
                          ?.toDate()
                          .toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-800">
                      ${groupTotal.toFixed(2)}
                    </p>
                    <button
                      onClick={() => openCollect(orders)}
                      className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Collect Payment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collected today */}
      {paidToday.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Collected Today
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {[
                    "Order",
                    "Customer",
                    "Table",
                    "Method",
                    "Amount",
                    "Time",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-gray-500 font-medium text-xs"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidToday.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-amber-600 font-semibold">
                      #{o.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {o.customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {o.tableNumber ? `Table ${o.tableNumber}` : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {o.paymentMethod === "scan" ? "Scan QR" : o.paymentMethod}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      ${o.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {(o.paidAt as Timestamp | undefined)
                        ?.toDate()
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handlePrint([o])}
                        title="Print Receipt"
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectingOrders.length > 0 && (() => {
        const first = collectingOrders[0];
        const taxRate = (settings?.taxRate ?? 0) / 100;
        // Re-compute tax-inclusive totals for display (walk-in orders have tax=0 until now)
        const computedOrders = collectingOrders.map((o) => {
          const taxableBase = o.subtotal - o.discount + o.deliveryFee;
          const tax = parseFloat((taxableBase * taxRate).toFixed(2));
          const total = parseFloat((taxableBase + tax).toFixed(2));
          return { ...o, tax, total };
        });
        const preTaxTotal = collectingOrders.reduce((s, o) => s + o.subtotal - o.discount + o.deliveryFee, 0);
        const totalTax = parseFloat((preTaxTotal * taxRate).toFixed(2));
        const grandTotal = parseFloat((preTaxTotal + totalTax).toFixed(2));
        const tableLabel = first.tableNumber != null ? `Table ${first.tableNumber}` : `#${first.id.slice(-6).toUpperCase()}`;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">
                    Collect Payment
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tableLabel}
                    {collectingOrders.length > 1 && ` · ${collectingOrders.length} orders`}
                  </p>
                </div>
                <button
                  onClick={() => setCollectingOrders([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Amount due */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5 text-center">
                <p className="text-xs text-amber-600 mb-1 font-medium">
                  Amount Due
                </p>
                <p className="text-4xl font-bold text-amber-700">
                  ${grandTotal.toFixed(2)}
                </p>
                {taxRate > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    incl. tax ${totalTax.toFixed(2)} ({settings?.taxRate}%)
                  </p>
                )}
                <p className="text-sm text-amber-600 mt-1">
                  {first.customerName}
                </p>
                {computedOrders.length > 1 && (
                  <div className="mt-2 text-left space-y-0.5">
                    {computedOrders.map((o) => (
                      <div key={o.id} className="flex justify-between text-xs text-amber-700">
                        <span className="font-mono">#{o.id.slice(-6).toUpperCase()}</span>
                        <span>${o.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Method picker */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Payment Method
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {METHOD_OPTIONS.map(({ method, label, icon: Icon }) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all ${
                      selectedMethod === method
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        selectedMethod === method
                          ? "text-amber-600"
                          : "text-gray-400"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        selectedMethod === method
                          ? "text-amber-700"
                          : "text-gray-600"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={confirmPayment}
                disabled={processingPayment}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl disabled:opacity-60 transition-colors text-sm"
              >
                {processingPayment
                  ? "Processing…"
                  : `Confirm ${selectedMethod === "scan" ? "Scan QR" : selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Payment`}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
  };
  const icons: Record<string, React.ReactNode> = {
    amber: <Clock className="w-5 h-5" />,
    green: <CheckCircle className="w-5 h-5" />,
    blue: <Wallet className="w-5 h-5" />,
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}
      >
        {icons[color]}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
