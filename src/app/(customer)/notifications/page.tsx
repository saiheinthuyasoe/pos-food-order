"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types";
import { Bell, CheckCheck, Package, Tag, Info } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order_update: <Package className="w-4 h-4 text-amber-600" />,
  promotion: <Tag className="w-4 h-4 text-purple-600" />,
  general: <Info className="w-4 h-4 text-blue-600" />,
};

const TYPE_LABEL_COLORS: Record<string, string> = {
  order_update: "bg-amber-50 text-amber-700",
  promotion: "bg-purple-50 text-purple-700",
  general: "bg-blue-50 text-blue-700",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification),
      );
      setLoading(false);
    });
  }, [user]);

  const markRead = async (notif: Notification) => {
    if (notif.read) return;
    await updateDoc(doc(db, "notifications", notif.id), { read: true });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) =>
      batch.update(doc(db, "notifications", n.id), { read: true }),
    );
    await batch.commit();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const ts = (n: Notification) => {
    const date = n.createdAt?.toDate?.();
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">
          Please log in to view notifications.
        </p>
        <Link
          href="/auth?redirect=/notifications"
          className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <span className="min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-amber-200"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markRead(notif)}
              className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                !notif.read
                  ? "bg-amber-50 border-amber-100 hover:bg-amber-100"
                  : "bg-white border-gray-100 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${TYPE_LABEL_COLORS[notif.type] ?? "bg-gray-50 text-gray-500"}`}
                >
                  {TYPE_ICONS[notif.type] ?? <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${!notif.read ? "font-medium text-gray-800" : "text-gray-600"}`}
                  >
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{ts(notif)}</span>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-amber-500 rounded-full" />
                    )}
                  </div>
                </div>
                {notif.orderId && (
                  <Link
                    href={`/orders/${notif.orderId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(notif);
                    }}
                    className="flex-shrink-0 text-xs text-amber-600 hover:underline border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-50"
                  >
                    Track
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
