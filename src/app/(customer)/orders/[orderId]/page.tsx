"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus } from "@/types";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CheckCircle, Circle, Clock } from "lucide-react";

const WALKIN_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready to Pick Up" },
  { status: "delivered", label: "Served" },
];

const DELIVERY_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "out_for_delivery", label: "Out for Delivery" },
  { status: "delivered", label: "Delivered" },
];

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

function getStepIndex(status: OrderStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { fmt } = useCurrency();

  useEffect(() => {
    if (!orderId) return;
    return onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order);
      setLoading(false);
    });
  }, [orderId]);

  if (loading)
    return <div className="p-10 text-center text-gray-400">Loading…</div>;
  if (!order)
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500">Order not found.</p>
        <Link href="/" className="text-amber-600 hover:underline mt-2 block">
          Back to Home
        </Link>
      </div>
    );

  const isCancelled = order.status === "cancelled";
  const steps = order.orderType === "delivery" ? DELIVERY_STEPS : WALKIN_STEPS;
  const currentIdx = getStepIndex(order.status);

  const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

  const getStepState = (stepStatus: OrderStatus) => {
    if (isCancelled) return "cancelled";
    const stepIdx = getStepIndex(stepStatus);
    if (stepIdx < currentIdx) return "done";
    if (stepIdx === currentIdx)
      return TERMINAL_STATUSES.includes(order.status) ? "done" : "active";
    return "pending";
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Track Your Order</h1>
      <p className="text-xs text-gray-400 font-mono mb-6">#{orderId}</p>

      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center mb-6">
          <p className="text-red-600 font-semibold">Order Cancelled</p>
          <p className="text-red-400 text-sm mt-1">
            This order has been cancelled. Please contact us if you have
            questions.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <div className="space-y-0">
            {steps.map((step, i) => {
              const state = getStepState(step.status);
              const isLast = i === steps.length - 1;
              const histEntry = order.statusHistory?.find(
                (h) => h.status === step.status,
              );
              return (
                <div key={step.status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        state === "done"
                          ? "bg-green-100"
                          : state === "active"
                            ? "bg-amber-100"
                            : "bg-gray-100"
                      }`}
                    >
                      {state === "done" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : state === "active" ? (
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 my-1 min-h-[20px] ${state === "done" ? "bg-green-200" : "bg-gray-100"}`}
                      />
                    )}
                  </div>
                  <div className={`pb-4 ${isLast ? "" : ""}`}>
                    <p
                      className={`font-medium text-sm ${
                        state === "active"
                          ? "text-amber-700"
                          : state === "done"
                            ? "text-green-700"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    {histEntry && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(histEntry.timestamp as Timestamp)
                          ?.toDate()
                          .toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                    )}
                    {state === "active" && (
                      <p className="text-xs text-amber-500 mt-0.5 font-medium">
                        In progress…
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order info */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">
          Order Details
        </h2>
        <div className="space-y-1.5">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.name} ×{item.quantity}
              </span>
              <span className="text-gray-700">{fmt(item.lineTotal)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold text-gray-800">
            <span>Total</span>
            <span>{fmt(order.total)}</span>
          </div>
        </div>
      </div>

      {order.orderType === "delivery" &&
        order.status !== "delivered" &&
        order.status !== "cancelled" && (
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-700 flex items-center gap-2 mb-5">
            <span className="text-xl">🛵</span>
            <span>
              Estimated delivery in <strong>~45 minutes</strong> from order
              placed.
            </span>
          </div>
        )}

      <div className="flex gap-3">
        <Link
          href="/"
          className="flex-1 py-2.5 text-center text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          Back to Home
        </Link>
        <Link
          href="/orders"
          className="flex-1 py-2.5 text-center text-sm font-medium text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50"
        >
          My Orders
        </Link>
      </div>
    </div>
  );
}
