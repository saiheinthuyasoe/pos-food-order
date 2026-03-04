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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, StaffMember } from "@/types";
import { getDocs } from "firebase/firestore";
import { Eye, Receipt } from "lucide-react";

export default function DeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Active delivery orders
    const q = query(
      collection(db, "orders"),
      where("orderType", "==", "delivery"),
      where("status", "not-in", ["awaiting_payment", "delivered", "cancelled"]),
      orderBy("status"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
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

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-orange-100 text-orange-700",
    out_for_delivery: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Delivery</h1>
        <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-medium">
          {orders.length} active
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">
            No active delivery orders.
          </p>
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
                  Address
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Assigned To
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Payment Slip
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-50 last:border-0"
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
                    <select
                      title="Assign Delivery Staff"
                      value={order.assignedDeliveryStaffId ?? ""}
                      onChange={(e) => {
                        const staff = deliveryStaff.find(
                          (s) => s.id === e.target.value,
                        );
                        if (staff) assignStaff(order.id, staff.id, staff.name);
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
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
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
        )}
      </div>
    </div>
  );
}
