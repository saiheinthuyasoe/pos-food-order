"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PromoCode } from "@/types";
import {
  Minus,
  Plus,
  Trash2,
  Tag,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, totalItems, subtotal } = useCart();
  const { fmt } = useCurrency();

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    setPromo(null);
    try {
      const snap = await getDocs(
        query(collection(db, "promo_codes"), where("code", "==", code)),
      );
      if (snap.empty) {
        setPromoError("Code not found.");
        return;
      }
      const docSnap = snap.docs[0];
      const p = docSnap.data() as PromoCode;
      if (!p.active) {
        setPromoError("This promo code is inactive.");
        return;
      }
      if (p.expiryDate && (p.expiryDate as Timestamp).toDate() < new Date()) {
        setPromoError("This promo code has expired.");
        return;
      }
      if (subtotal < p.minOrderValue) {
        setPromoError(`Minimum order ${fmt(p.minOrderValue)} required.`);
        return;
      }
      if (p.usageLimit > 0 && p.usageCount >= p.usageLimit) {
        setPromoError("This promo code has reached its usage limit.");
        return;
      }
      setPromo({ ...p, id: docSnap.id });
    } catch {
      setPromoError("Failed to validate code.");
    } finally {
      setPromoLoading(false);
    }
  };

  const discount = promo
    ? promo.discountType === "percentage"
      ? (subtotal * promo.discountAmount) / 100
      : promo.discountAmount
    : 0;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Your cart is empty
        </h1>
        <p className="text-gray-500 mb-8">
          Add some delicious dishes to get started!
        </p>
        <Link
          href="/menu"
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Your Cart ({totalItems} items)
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.cartItemKey}
              className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-amber-50 flex-shrink-0">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl">
                    🍽️
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm truncate">
                  {item.name}
                </h3>
                {item.selectedOptions &&
                  Object.keys(item.selectedOptions).length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Object.entries(item.selectedOptions)
                        .map(
                          ([k, v]) =>
                            `${k}: ${Array.isArray(v) ? v.join(", ") : v}`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                <p className="text-amber-600 font-semibold text-sm mt-1">
                  {fmt(item.unitPrice)} each
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      title="updateQuantity"
                      onClick={() =>
                        updateQuantity(item.cartItemKey, item.quantity - 1)
                      }
                      className="px-2.5 py-1 hover:bg-gray-50"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      title="updateQuantity"
                      onClick={() =>
                        updateQuantity(item.cartItemKey, item.quantity + 1)
                      }
                      className="px-2.5 py-1 hover:bg-gray-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">
                      {fmt(item.unitPrice * item.quantity)}
                    </span>
                    <button
                      title="removeItem"
                      onClick={() => removeItem(item.cartItemKey)}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Promo */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Tag className="w-4 h-4 text-amber-500" /> Promo Code
            </p>
            <div className="flex items-stretch border border-gray-200 rounded-lg overflow-hidden focus-within:border-amber-400">
              <input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  setPromo(null);
                  setPromoError("");
                }}
                placeholder="Enter code"
                className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
              />
              <button
                onClick={applyPromo}
                disabled={promoLoading || !promoInput}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {promoLoading ? "…" : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
            {promoError && (
              <p className="text-xs text-red-500 mt-1">{promoError}</p>
            )}
            {promo && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✓ {promo.code} —{" "}
                {promo.discountType === "percentage"
                  ? `${promo.discountAmount}% off`
                  : `${fmt(promo.discountAmount)} off`}
              </p>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({promo?.code})</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Delivery fee</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-800">
                <span>Est. Total</span>
                <span>{fmt(subtotal - discount)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (promo)
                sessionStorage.setItem("promoCode", JSON.stringify(promo));
              else sessionStorage.removeItem("promoCode");
              router.push("/checkout");
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" /> Proceed to Checkout
          </button>
          <Link
            href="/menu"
            className="block text-center text-sm text-gray-500 hover:text-amber-600"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
