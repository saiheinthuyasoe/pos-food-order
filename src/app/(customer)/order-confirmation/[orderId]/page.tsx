"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { CheckCircle, Copy, ArrowRight } from "lucide-react";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    getDoc(doc(db, "orders", orderId)).then((snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order);
      setLoading(false);
    });
  }, [orderId]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const estimatedMins = order.orderType === "walkin" ? 20 : 45;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Order Placed!</h1>
        <p className="text-gray-500 mt-1">
          Thanks, {order.customerName}. We&apos;ve received your order.
        </p>
      </div>

      {/* Order ID */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">
            Order ID
          </p>
          <p className="font-mono text-sm font-semibold text-gray-700 mt-0.5">
            {orderId}
          </p>
        </div>
        <button
          onClick={copyOrderId}
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Order Type</span>
          <span className="font-medium text-gray-800 capitalize">
            {order.orderType === "walkin" ? "Walk-in / Dine In" : "Delivery"}
          </span>
        </div>
        {order.tableNumber && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Table</span>
            <span className="font-medium text-gray-800">
              Table {order.tableNumber}
            </span>
          </div>
        )}
        {order.deliveryAddress && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery To</span>
            <span className="font-medium text-gray-800 text-right max-w-[180px]">
              {order.deliveryAddress}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment</span>
          <span className="font-medium text-gray-800 capitalize">
            {order.paymentMethod}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Placed At</span>
          <span className="font-medium text-gray-800">
            {(order.createdAt as Timestamp)
              ?.toDate()
              .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex items-center justify-center gap-2 text-sm text-amber-600">
          <span className="text-xl">⏱</span>
          <span className="font-medium">
            Estimated ready in <strong>{estimatedMins} min</strong>
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-gray-700 mb-3">Items Ordered</h2>
        <div className="space-y-2 mb-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.name} ×{item.quantity}
              </span>
              <span className="font-medium text-gray-800">
                ${item.lineTotal.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-2 space-y-1 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Delivery fee</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Link
        href={`/orders/${orderId}`}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
      >
        Track My Order <ArrowRight className="w-4 h-4" />
      </Link>

      <Link
        href="/"
        className="block text-center text-sm text-gray-400 hover:text-amber-600 mt-4"
      >
        Back to Home
      </Link>
    </div>
  );
}
