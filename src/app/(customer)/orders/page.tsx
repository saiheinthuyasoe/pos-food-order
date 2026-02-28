"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Order } from "@/types";
import { RefreshCw, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 10;

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const { addItem, clearCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [reordered, setReordered] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDocs(
      query(
        collection(db, "orders"),
        where("customerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ),
    ).then((snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    });
  }, [user]);

  const loadMore = () => {
    if (!user || !lastDoc) return;
    setLoadingMore(true);
    getDocs(
      query(
        collection(db, "orders"),
        where("customerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      ),
    ).then((snap) => {
      setOrders((prev) => [
        ...prev,
        ...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order),
      ]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    });
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      addItem(
        {
          menuItemId: item.menuItemId,
          name: item.name,
          imageUrl: item.imageUrl,
          unitPrice: item.unitPrice,
          selectedOptions: item.selectedOptions ?? {},
        },
        item.quantity,
      );
    });
    setReordered(order.id);
    setTimeout(() => setReordered(null), 2000);
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Please log in to view your orders.</p>
        <Link
          href="/auth?redirect=/orders"
          className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-gray-500 mb-4">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/menu"
            className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-xs text-gray-400">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(order.createdAt as Timestamp)
                        ?.toDate()
                        .toLocaleDateString()}{" "}
                      ·{" "}
                      {(order.createdAt as Timestamp)
                        ?.toDate()
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                      {order.orderType === "walkin" ? "Walk-in" : "Delivery"}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <span key={i} className="text-sm text-gray-600">
                      {item.name} ×{item.quantity}
                      {i < Math.min(order.items.length, 3) - 1 ? ", " : ""}
                    </span>
                  ))}
                  {(order.items?.length ?? 0) > 3 && (
                    <span className="text-sm text-gray-400">
                      {" "}
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">
                    ${order.total.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReorder(order)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        reordered === order.id
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-amber-200 text-amber-600 hover:bg-amber-50"
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      {reordered === order.id ? "Added to cart!" : "Reorder"}
                    </button>
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                    >
                      <Eye className="w-3 h-3" /> View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm font-medium text-amber-600 border border-amber-200 rounded-2xl hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load More Orders"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
