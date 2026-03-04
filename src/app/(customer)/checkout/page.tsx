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
  setDoc,
  increment,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  RestaurantSettings,
  PromoCode,
  RestaurantTable,
  SavedAddress,
} from "@/types";
import {
  Banknote,
  AlertCircle,
  QrCode,
  Wallet,
  MapPin,
  ChevronDown,
  ExternalLink,
  Upload,
  CheckCircle,
  X,
} from "lucide-react";

type OrderTab = "walkin" | "delivery";
type PayMethod = "cash" | "card" | "scan";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();

  const [tab, setTab] = useState<OrderTab>("walkin");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const { fmt } = useCurrency();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addrPickerOpen, setAddrPickerOpen] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);
  const [qrOrderId, setQrOrderId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const [form, setForm] = useState({
    name: user?.displayName ?? "",
    phone: "",
    tableNumber: "",
    specialInstructions: "",
    address: "",
    apartment: "",
    mapsUrl: "",
    deliveryNotes: "",
  });

  useEffect(() => {
    if (user?.displayName) setForm((f) => ({ ...f, name: user.displayName! }));
  }, [user]);

  // Fetch user profile (saved addresses + phone)
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const addresses: SavedAddress[] = data.savedAddresses ?? [];
      setSavedAddresses(addresses);
      // Pre-fill phone if not already set
      if (data.phone) setForm((f) => ({ ...f, phone: f.phone || data.phone }));
      // Pre-fill default address
      const def = addresses.find((a) => a.isDefault);
      if (def)
        setForm((f) => ({
          ...f,
          address: f.address || def.address,
          apartment: f.apartment || def.apartment || "",
        }));
    });
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
  // Walk-in tax is collected by the cashier at payment time, not at order placement
  const taxRate = (settings?.taxRate ?? 0) / 100;
  const taxableAmount = subtotal - discount + deliveryFee;
  // For walk-in: tax is $0 at order time; cashier calculates it at payment
  const displayTax = tab === "walkin" ? 0 : taxableAmount * taxRate;
  const displayTotal =
    tab === "walkin" ? taxableAmount : taxableAmount + displayTax;

  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "address") setAddrSaved(false);
  };

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptError("");
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmReceipt = async () => {
    if (!qrOrderId || !receiptFile) return;
    setUploadingReceipt(true);
    setReceiptError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const fd = new FormData();
      fd.append("file", receiptFile);
      fd.append("orderId", qrOrderId);
      const res = await fetch("/api/upload/receipt", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      await res.json();
      clearCart();
      router.push(`/order-confirmation/${qrOrderId}`);
    } catch (e) {
      clearTimeout(timeout);
      console.error(e);
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Upload timed out. Please try again."
          : e instanceof Error
            ? e.message
            : "Failed to upload receipt. Please try again.";
      setReceiptError(msg);
      setUploadingReceipt(false);
    }
  };

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

      const isDeliveryScan = tab === "delivery" && payMethod === "scan";
      const initialStatus: import("@/types").OrderStatus = isDeliveryScan
        ? "awaiting_payment"
        : "pending";

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
        // Walk-in: tax is $0 now; cashier will update tax+total when collecting payment
        tax: tab === "walkin" ? 0 : parseFloat(displayTax.toFixed(2)),
        total: parseFloat(displayTotal.toFixed(2)),
        status: initialStatus,
        paymentMethod: tab === "walkin" ? "cash" : payMethod,
        paymentStatus: "pending",
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
        statusHistory: [{ status: initialStatus, timestamp: new Date() }],
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
            tax: parseFloat(displayTax.toFixed(2)),
            total: parseFloat(displayTotal.toFixed(2)),
            ...(promo ? { promoCode: promo.code } : {}),
            paymentMethod: tab === "walkin" ? "cash" : payMethod,
            estimatedTime:
              tab === "walkin"
                ? "Ready in ~20 minutes"
                : "Delivery in ~45 minutes",
          }),
        }).catch(() => {
          /* ignore email errors */
        });
      }

      // For delivery + scan: show PromptPay QR modal, wait for receipt upload
      if (isDeliveryScan) {
        setQrOrderId(orderRef.id);
        return;
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
    <>
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
                    title="Full Name"
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
                      title="Table Number"
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
                  {/* Saved address picker */}
                  {savedAddresses.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">
                        Saved Addresses
                      </label>
                      <div className="space-y-2">
                        {savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => {
                              setField("address", addr.address);
                              setField("apartment", addr.apartment ?? "");
                              setAddrPickerOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              form.address === addr.address
                                ? "border-amber-400 bg-amber-50"
                                : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                            }`}
                          >
                            <MapPin
                              className={`w-4 h-4 flex-shrink-0 ${
                                form.address === addr.address
                                  ? "text-amber-500"
                                  : "text-gray-400"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-700">
                                  {addr.label}
                                </span>
                                {addr.isDefault && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {addr.address}
                              </p>
                              {addr.apartment && (
                                <p className="text-xs text-gray-400">
                                  {addr.apartment}
                                </p>
                              )}
                            </div>
                            {addr.mapsUrl && (
                              <a
                                href={addr.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                                title="Open in Google Maps"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 border-t border-dashed border-gray-200 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAddrPickerOpen(!addrPickerOpen);
                            setField("address", "");
                          }}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${addrPickerOpen ? "rotate-180" : ""}`}
                          />
                          Enter a different address
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual address input — always shown if no saved addresses, or toggled */}
                  {(savedAddresses.length === 0 ||
                    addrPickerOpen ||
                    (form.address &&
                      !savedAddresses.find(
                        (a) => a.address === form.address,
                      ))) && (
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
                  )}
                  {/* Apartment — only when NOT using a saved address */}
                  {!savedAddresses.some((a) => a.address === form.address) && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">
                            Apartment / Floor
                          </label>
                          <input
                            value={form.apartment}
                            onChange={(e) =>
                              setField("apartment", e.target.value)
                            }
                            placeholder="Apt 4B"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">
                            Google Maps Link
                          </label>
                          <input
                            value={form.mapsUrl}
                            onChange={(e) =>
                              setField("mapsUrl", e.target.value)
                            }
                            placeholder="https://maps.google.com/..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                          />
                        </div>
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
                  )}

                  {/* Delivery notes when using a saved address */}
                  {savedAddresses.some((a) => a.address === form.address) && (
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
                  )}

                  {/* Save to profile — only when typing a new address and user is logged in */}
                  {user &&
                    form.address &&
                    !savedAddresses.some((a) => a.address === form.address) && (
                      <button
                        type="button"
                        disabled={addrSaved}
                        onClick={async () => {
                          if (!user || !form.address) return;
                          const newSaved: SavedAddress = {
                            id: crypto.randomUUID(),
                            label: "Home",
                            address: form.address,
                            ...(form.apartment
                              ? { apartment: form.apartment }
                              : {}),
                            ...(form.mapsUrl ? { mapsUrl: form.mapsUrl } : {}),
                            isDefault: savedAddresses.length === 0,
                          };
                          const updated = [...savedAddresses, newSaved];
                          await setDoc(
                            doc(db, "users", user.uid),
                            { savedAddresses: updated },
                            { merge: true },
                          );
                          setSavedAddresses(updated);
                          setAddrSaved(true);
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-medium transition-all ${
                          addrSaved
                            ? "border-green-200 bg-green-50 text-green-600 cursor-default"
                            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {addrSaved
                          ? "Saved to profile ✓"
                          : "Save address to profile"}
                      </button>
                    )}
                </div>
              )}
            </div>

            {/* Payment — only for delivery; walk-in is handled by cashier */}
            {tab === "delivery" ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 mb-4">
                  Payment Method
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPayMethod("cash")}
                    className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                      payMethod === "cash"
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200"
                    }`}
                  >
                    <Banknote
                      className={`w-5 h-5 ${
                        payMethod === "cash"
                          ? "text-amber-600"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="text-left">
                      <p
                        className={`font-medium text-sm ${
                          payMethod === "cash"
                            ? "text-amber-700"
                            : "text-gray-700"
                        }`}
                      >
                        Cash
                      </p>
                      <p className="text-xs text-gray-400">Pay on delivery</p>
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
                      className={`w-5 h-5 ${
                        payMethod === "scan"
                          ? "text-amber-600"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="text-left">
                      <p
                        className={`font-medium text-sm ${
                          payMethod === "scan"
                            ? "text-amber-700"
                            : "text-gray-700"
                        }`}
                      >
                        Scan QR
                      </p>
                      <p className="text-xs text-gray-400">Scan &amp; pay</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-gray-700 mb-3">Payment</h2>
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <Wallet className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Payment at the counter
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Our cashier will collect your payment (cash, card, or QR
                      scan) when your order is ready.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">
                Order Summary
              </h2>
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
                      {fmt(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{fmt(discount)}</span>
                  </div>
                )}
                {tab === "delivery" && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery fee</span>
                    <span>{fmt(deliveryFee)}</span>
                  </div>
                )}
                {tab === "walkin" ? (
                  <div className="flex justify-between text-gray-400 text-xs italic">
                    <span>Tax ({settings?.taxRate ?? 0}%)</span>
                    <span>calculated at counter</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax ({settings?.taxRate ?? 0}%)</span>
                    <span>{fmt(displayTax)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-800 text-base">
                  <span>Total{tab === "walkin" ? " (before tax)" : ""}</span>
                  <span>{fmt(displayTotal)}</span>
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
              disabled={placing || (tab === "delivery" && payMethod === "card")}
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

      {/* PromptPay QR Modal — shown after placing a delivery+scan order */}
      {qrOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setQrOrderId(null);
                setReceiptFile(null);
                setReceiptPreview(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">
              Scan to Pay
            </h2>
            <p className="text-xs text-gray-400 text-center mb-5">
              Pay via PromptPay, then upload your slip
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              {settings?.promptPayQrUrl ? (
                <img
                  src={settings.promptPayQrUrl}
                  alt="PromptPay QR"
                  className="w-52 h-52 rounded-xl border border-gray-200 object-contain bg-white"
                />
              ) : (
                <div className="w-52 h-52 bg-gray-100 rounded-xl flex items-center justify-center p-4">
                  <p className="text-xs text-gray-400 text-center">
                    PromptPay QR not configured.
                    <br />
                    Please contact the restaurant.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center mb-5">
              <p className="text-2xl font-bold text-amber-700">
                {fmt(displayTotal)}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Order #{qrOrderId.slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Receipt upload */}
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Upload Payment Slip *
            </p>
            <label
              className={`flex flex-col items-center gap-2 w-full py-5 px-3 border-2 border-dashed rounded-xl cursor-pointer transition-all mb-4 ${
                receiptFile
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 hover:border-amber-400 hover:bg-amber-50"
              }`}
            >
              {receiptPreview ? (
                <img
                  src={receiptPreview}
                  alt="Slip preview"
                  className="w-28 h-28 object-cover rounded-lg"
                />
              ) : (
                <Upload className="w-8 h-8 text-gray-300" />
              )}
              <span className="text-xs text-gray-500 text-center">
                {receiptFile
                  ? receiptFile.name
                  : "Tap to upload payment slip photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReceiptFile}
              />
            </label>

            {receiptFile && (
              <div className="flex items-center gap-2 text-xs text-green-600 mb-3">
                <CheckCircle className="w-4 h-4" />
                Slip selected — tap Complete Payment to submit
              </div>
            )}

            <button
              onClick={handleConfirmReceipt}
              disabled={!receiptFile || uploadingReceipt}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl disabled:opacity-50 text-sm"
            >
              {uploadingReceipt ? "Uploading\u2026" : "Complete Payment"}
            </button>
            {receiptError && (
              <p className="text-xs text-red-500 text-center mt-2">
                {receiptError}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
