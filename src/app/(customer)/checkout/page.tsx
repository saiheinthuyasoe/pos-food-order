"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { RestaurantSettings, PromoCode, RestaurantTable } from "@/types";
import { CreditCard, Banknote, AlertCircle, QrCode } from "lucide-react";

type OrderTab = "walkin" | "delivery";
type PayMethod = "cash" | "card" | "scan";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();

  const [tab, setTab] = useState<OrderTab>("walkin");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: user?.displayName ?? "",
    phone: "",
    tableNumber: "",
    specialInstructions: "",
    address: "",
    apartment: "",
    deliveryNotes: "",
  });

  useEffect(() => {
    if (user?.displayName) setForm((f) => ({ ...f, name: user.displayName! }));
  }, [user]);

  useEffect(() => {
    getDoc(doc(db, "settings", "restaurant")).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as RestaurantSettings);
    });
    getDocs(query(collection(db, "tables"), orderBy("tableNumber"))).then(
      (snap) =>
        setTables(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RestaurantTable),
        ),
    );
    // Load promo from cart page
    const stored = sessionStorage.getItem("promoCode");
    if (stored) {
      try {
        setPromo(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const deliveryFee = tab === "delivery" ? (settings?.deliveryFee ?? 0) : 0;
  const discount = promo
    ? promo.discountType === "percentage"
      ? (subtotal * promo.discountAmount) / 100
      : promo.discountAmount
    : 0;
  const taxRate = (settings?.taxRate ?? 0) / 100;
  const taxableAmount = subtotal - discount + deliveryFee;
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePlaceOrder = async () => {
    setError("");
    if (!user) {
      router.push("/auth?redirect=/checkout");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    if (tab === "walkin" && !form.tableNumber) {
      setError("Please select a table.");
      return;
    }
    if (tab === "delivery" && !form.address) {
      setError("Delivery address is required.");
      return;
    }

    setPlacing(true);
    try {
      const orderItems = items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        imageUrl: i.imageUrl ?? "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        selectedOptions: i.selectedOptions ?? {},
        lineTotal: i.unitPrice * i.quantity,
      }));

      const orderData = {
        customerId: user.uid,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: user.email ?? "",
        orderType: tab,
        items: orderItems,
        subtotal,
        discount,
        ...(promo ? { promoCode: promo.code } : {}),
        deliveryFee,
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        status: "pending",
        paymentMethod: payMethod,
        paymentStatus: payMethod === "cash" ? "pending" : "pending",
        ...(tab === "walkin"
          ? { tableNumber: parseInt(form.tableNumber) }
          : {}),
        ...(tab === "delivery"
          ? {
              deliveryAddress: `${form.address}${form.apartment ? `, ${form.apartment}` : ""}`,
              deliveryNotes: form.deliveryNotes,
            }
          : {}),
        specialInstructions: form.specialInstructions,
        statusHistory: [{ status: "pending", timestamp: new Date() }],
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Mark table as occupied
      if (tab === "walkin" && form.tableNumber) {
        const tableDoc = tables.find(
          (t) => String(t.tableNumber) === form.tableNumber,
        );
        if (tableDoc) {
          await updateDoc(doc(db, "tables", tableDoc.id), {
            status: "occupied",
            currentOrderId: orderRef.id,
          });
        }
      }

      // Increment promo usage
      if (promo) {
        await updateDoc(doc(db, "promo_codes", promo.id), {
          usageCount: increment(1),
        });
        sessionStorage.removeItem("promoCode");
      }

      // Write notification
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        type: "order_update",
        message: "Your order has been placed! We'll confirm it shortly.",
        orderId: orderRef.id,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Send confirmation email (fire-and-forget — don't block the redirect)
      if (user.email) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "order_confirmation",
            to: user.email,
            orderId: orderRef.id,
            customerName: form.name,
            orderType: tab,
            ...(tab === "walkin"
              ? { tableNumber: parseInt(form.tableNumber) }
              : {}),
            ...(tab === "delivery"
              ? {
                  deliveryAddress: `${form.address}${form.apartment ? `, ${form.apartment}` : ""}`,
                }
              : {}),
            items: orderItems,
            subtotal,
            discount,
            deliveryFee,
            tax: parseFloat(tax.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            ...(promo ? { promoCode: promo.code } : {}),
            paymentMethod: payMethod,
            estimatedTime:
              tab === "walkin"
                ? "Ready in ~20 minutes"
                : "Delivery in ~45 minutes",
          }),
        }).catch(() => {
          /* ignore email errors */
        });
      }

      clearCart();
      router.push(`/order-confirmation/${orderRef.id}`);
    } catch (e) {
      console.error(e);
      setError("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order type tabs */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setTab("walkin")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === "walkin"
                    ? "bg-amber-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                🪑 Walk-in / Dine In
              </button>
              <button
                onClick={() => setTab("delivery")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === "delivery"
                    ? "bg-amber-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                🛵 Delivery
              </button>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Your Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Full Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Walk-in fields */}
            {tab === "walkin" && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    Table Number *
                  </label>
                  <select
                    value={form.tableNumber}
                    onChange={(e) => setField("tableNumber", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Select a table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={String(t.tableNumber)}>
                        Table {t.tableNumber} ({t.seats} seats)
                        {t.status === "occupied"
                          ? " — occupied"
                          : t.status === "reserved"
                            ? " — reserved"
                            : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    Special Instructions
                  </label>
                  <input
                    value={form.specialInstructions}
                    onChange={(e) =>
                      setField("specialInstructions", e.target.value)
                    }
                    placeholder="Allergies, preferences…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* Delivery fields */}
            {tab === "delivery" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    Street Address *
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Apartment / Floor
                    </label>
                    <input
                      value={form.apartment}
                      onChange={(e) => setField("apartment", e.target.value)}
                      placeholder="Apt 4B"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Delivery Notes
                    </label>
                    <input
                      value={form.deliveryNotes}
                      onChange={(e) =>
                        setField("deliveryNotes", e.target.value)
                      }
                      placeholder="Leave at door…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Payment Method</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPayMethod("cash")}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                  payMethod === "cash"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200"
                }`}
              >
                <Banknote
                  className={`w-5 h-5 ${payMethod === "cash" ? "text-amber-600" : "text-gray-400"}`}
                />
                <div className="text-left">
                  <p
                    className={`font-medium text-sm ${payMethod === "cash" ? "text-amber-700" : "text-gray-700"}`}
                  >
                    Cash
                  </p>
                  <p className="text-xs text-gray-400">Pay on arrival</p>
                </div>
              </button>
              <button
                onClick={() => setPayMethod("scan")}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                  payMethod === "scan"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200"
                }`}
              >
                <QrCode
                  className={`w-5 h-5 ${payMethod === "scan" ? "text-amber-600" : "text-gray-400"}`}
                />
                <div className="text-left">
                  <p
                    className={`font-medium text-sm ${payMethod === "scan" ? "text-amber-700" : "text-gray-700"}`}
                  >
                    Scan QR
                  </p>
                  <p className="text-xs text-gray-400">Scan &amp; pay</p>
                </div>
              </button>
              <button
                onClick={() => setPayMethod("card")}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                  payMethod === "card"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200"
                }`}
              >
                <CreditCard
                  className={`w-5 h-5 ${payMethod === "card" ? "text-amber-600" : "text-gray-400"}`}
                />
                <div className="text-left">
                  <p
                    className={`font-medium text-sm ${payMethod === "card" ? "text-amber-700" : "text-gray-700"}`}
                  >
                    Card
                  </p>
                  <p className="text-xs text-gray-400">Stripe · coming soon</p>
                </div>
              </button>
            </div>
            {payMethod === "card" && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Card payment requires Stripe configuration. Please select Cash
                or Scan QR for now.
              </div>
            )}
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div
                  key={item.cartItemKey}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-600 truncate pr-2">
                    {item.name} ×{item.quantity}
                  </span>
                  <span className="font-medium text-gray-800 whitespace-nowrap">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              {tab === "delivery" && (
                <div className="flex justify-between text-gray-500">
                  <span>Delivery fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Tax ({settings?.taxRate ?? 0}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placing || payMethod === "card"}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl disabled:opacity-50 text-sm"
          >
            {placing ? "Placing Order…" : "Place Order"}
          </button>
          <Link
            href="/cart"
            className="block text-center text-xs text-gray-400 hover:text-amber-600"
          >
            ← Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
