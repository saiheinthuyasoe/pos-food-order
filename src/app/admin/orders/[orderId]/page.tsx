"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Order, OrderStatus, RestaurantSettings } from "@/types";
import { ArrowLeft, CheckCircle, Clock, Printer } from "lucide-react";
import { STATUS_COLORS } from "../page";
import { printReceipt } from "@/lib/printReceipt";

const NEXT_STATUS: Partial<
  Record<OrderStatus, { walkin: OrderStatus; delivery: OrderStatus }>
> = {
  pending: { walkin: "confirmed", delivery: "confirmed" },
  confirmed: { walkin: "preparing", delivery: "preparing" },
  preparing: { walkin: "ready", delivery: "out_for_delivery" },
  ready: { walkin: "delivered", delivery: "delivered" },
  out_for_delivery: { walkin: "delivered", delivery: "delivered" },
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm Order",
  preparing: "Start Preparing",
  ready: "Mark Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Mark Delivered",
};

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { fmt } = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "restaurant")).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as RestaurantSettings);
    });
    return onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order);
      setLoading(false);
    });
  }, [orderId]);

  const advanceStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    const now = Timestamp.now();
    await updateDoc(doc(db, "orders", orderId), {
      status: newStatus,
      statusHistory: arrayUnion({ status: newStatus, timestamp: now }),
    });
    // Write notification
    await addDoc(collection(db, "notifications"), {
      userId: order.customerId,
      type: "order_update",
      message: `Your order #${orderId.slice(-6).toUpperCase()} is now: ${newStatus.replace("_", " ")}`,
      orderId,
      read: false,
      createdAt: now,
    });
    // Free the table when order is terminal
    if (
      (newStatus === "delivered" || newStatus === "cancelled") &&
      order.orderType === "walkin"
    ) {
      const tableSnap = await getDocs(
        query(collection(db, "tables"), where("currentOrderId", "==", orderId)),
      );
      for (const tableDoc of tableSnap.docs) {
        await updateDoc(tableDoc.ref, {
          status: "free",
          currentOrderId: deleteField(),
        });
      }
    }
    // Send delivered email
    if (newStatus === "delivered" && order.customerEmail) {
      fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_delivered",
          to: order.customerEmail,
          orderId,
          customerName: order.customerName,
          total: order.total,
        }),
      }).catch(() => {
        /* ignore */
      });
    }
    // Auto-print receipt when confirming a walk-in order.
    // NOTE: Tax is $0 on the order at this stage (calculated by cashier at payment).
    // This print is for the kitchen/staff copy only — the customer receipt with
    // tax is printed by the cashier when collecting payment.
    if (newStatus === "confirmed" && order.orderType === "walkin") {
      // Use the fresh order state that Firestore will push back, but we already
      // have the data — construct a receipt-ready copy with updated status.
      const receiptOrder: Order = { ...order, status: newStatus };
      printReceipt(receiptOrder, {
        restaurantName: settings?.name ?? "FoodOrder",
        address: settings?.address,
        phone: settings?.phone,
      });
    }

    setUpdating(false);
  };

  const handlePrint = () => {
    if (!order) return;
    printReceipt(order, {
      restaurantName: settings?.name ?? "FoodOrder",
      address: settings?.address,
      phone: settings?.phone,
    });
  };

  const cancelOrder = async () => {
    if (!order || !confirm("Cancel this order?")) return;
    await advanceStatus("cancelled");
  };

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!order) return <div className="p-6 text-gray-500">Order not found.</div>;

  const nextStatus = NEXT_STATUS[order.status]?.[order.orderType];
  const nextLabel = nextStatus ? ACTION_LABELS[nextStatus] : null;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/orders"
          className="text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Order #{orderId.slice(-6).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500">
            {order.createdAt?.toDate().toLocaleString()}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Print button — walk-in once confirmed; delivery+cash at any active stage */}
          {(order.orderType === "walkin" ||
            (order.orderType === "delivery" &&
              order.paymentMethod === "cash")) &&
            !["pending", "cancelled"].includes(order.status) && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            )}
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[order.status]}`}
          >
            {order.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer + Order Info */}
          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4 text-sm">
            <Info label="Customer" value={order.customerName} />
            <Info label="Phone" value={order.customerPhone} />
            <Info
              label="Order Type"
              value={order.orderType === "walkin" ? "Walk-in" : "Delivery"}
            />
            {order.orderType === "walkin" ? (
              <Info
                label="Table"
                value={order.tableNumber ? `Table ${order.tableNumber}` : "—"}
              />
            ) : (
              <Info
                label="Delivery Address"
                value={order.deliveryAddress ?? "—"}
              />
            )}
            <Info
              label="Payment"
              value={`${order.paymentMethod === "scan" ? "Scan QR" : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)} · ${order.paymentStatus}`}
            />
            {order.specialInstructions && (
              <div className="col-span-2">
                <Info
                  label="Special Instructions"
                  value={order.specialInstructions}
                />
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-700 text-sm">
              Items
            </div>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {item.name}
                      {item.selectedOptions &&
                        Object.keys(item.selectedOptions).length > 0 && (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">
                            {Object.entries(item.selectedOptions)
                              .map(
                                ([k, v]) =>
                                  `${k}: ${Array.isArray(v) ? v.join(", ") : v}`,
                              )
                              .join(", ")}
                          </div>
                        )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      x{item.quantity}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      {fmt(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{fmt(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount {order.promoCode && `(${order.promoCode})`}
                  </span>
                  <span>-{fmt(order.discount)}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Delivery Fee</span>
                  <span>{fmt(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                {order.orderType === "walkin" &&
                order.paymentStatus !== "paid" ? (
                  <span className="text-xs italic text-gray-400">
                    calculated at cashier
                  </span>
                ) : (
                  <span>{fmt(order.tax)}</span>
                )}
              </div>
              <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-100">
                <span>
                  Total
                  {order.orderType === "walkin" &&
                  order.paymentStatus !== "paid"
                    ? " (before tax)"
                    : ""}
                </span>
                <span>{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!["delivered", "cancelled"].includes(order.status) && (
            <div className="flex gap-3">
              {nextLabel && (
                <button
                  onClick={() => nextStatus && advanceStatus(nextStatus)}
                  disabled={updating}
                  className="flex-1 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {updating ? "Updating…" : nextLabel}
                </button>
              )}
              <button
                onClick={cancelOrder}
                disabled={updating}
                className="rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">
            Status Timeline
          </h2>
          {order.statusHistory && order.statusHistory.length > 0 ? (
            <ol className="relative border-l border-gray-200 ml-2 space-y-5">
              {[...order.statusHistory].reverse().map((entry, i) => {
                const isTerminal = ["delivered", "cancelled"].includes(
                  order.status,
                );
                const isCurrent = i === 0;
                const isActive = isCurrent && !isTerminal;
                return (
                  <li key={i} className="ml-5">
                    <span
                      className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ${
                        isActive ? "bg-amber-100" : "bg-green-100"
                      }`}
                    >
                      {isActive ? (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </span>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {entry.status.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.timestamp instanceof Date
                        ? entry.timestamp.toLocaleString()
                        : (
                            entry.timestamp as import("firebase/firestore").Timestamp
                          )
                            ?.toDate()
                            .toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">No history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}
