"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RestaurantSettings, MenuItem, MenuItemOptionGroup } from "@/types";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/customer/Navbar";
import {
  MapPin,
  Phone,
  Clock,
  ShoppingCart,
  Star,
  X,
  Plus,
  Minus,
} from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// ─── Food Detail Modal (same as menu page) ──────────────────────────────────
interface ModalProps {
  item: MenuItem;
  onClose: () => void;
  onAdd: (
    item: MenuItem,
    qty: number,
    options: Record<string, string | string[]>,
  ) => void;
}
function FoodDetailModal({ item, onClose, onAdd }: ModalProps) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string | string[]>>(
    {},
  );
  const [added, setAdded] = useState(false);

  const extraCost =
    item.optionGroups?.reduce((sum, g) => {
      const sel = selected[g.label];
      if (Array.isArray(sel)) {
        return (
          sum +
          sel.reduce((s, name) => {
            const opt = g.options.find((o) => o.name === name);
            return s + (opt?.extraCost ?? 0);
          }, 0)
        );
      }
      const opt = g.options.find((o) => o.name === sel);
      return sum + (opt?.extraCost ?? 0);
    }, 0) ?? 0;
  const total = (item.price + extraCost) * qty;

  const requiredMissing =
    item.optionGroups?.filter((g) => {
      if (!g.required) return false;
      const sel = selected[g.label];
      if (Array.isArray(sel)) return sel.length === 0;
      return !sel;
    }).length ?? 0;

  const toggleOption = (group: MenuItemOptionGroup, optName: string) => {
    if (group.multiSelect) {
      setSelected((prev) => {
        const current = prev[group.label];
        const arr = Array.isArray(current) ? current : [];
        return {
          ...prev,
          [group.label]: arr.includes(optName)
            ? arr.filter((n) => n !== optName)
            : [...arr, optName],
        };
      });
    } else {
      setSelected((prev) => ({ ...prev, [group.label]: optName }));
    }
  };

  const isOptionSelected = (group: MenuItemOptionGroup, optName: string) => {
    const sel = selected[group.label];
    if (group.multiSelect) return Array.isArray(sel) && sel.includes(optName);
    return sel === optName;
  };

  const handleAdd = () => {
    onAdd(item, qty, selected);
    setAdded(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="relative h-52 bg-amber-50">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover sm:rounded-t-2xl"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl">
                🍽️
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-xl font-bold text-gray-800">{item.name}</h2>
            <span className="text-lg font-bold text-amber-600">
              ${item.price.toFixed(2)}
            </span>
          </div>
          {item.dietaryTags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.dietaryTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-gray-500 text-sm mb-4">{item.description}</p>
          {item.optionGroups?.map((group: MenuItemOptionGroup) => (
            <div key={group.label} className="mb-4">
              <p className="font-medium text-gray-700 mb-2 text-sm">
                {group.label}
                {group.required && <span className="text-red-500 ml-1">*</span>}
                {group.multiSelect && (
                  <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    multi-select
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.options.map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => toggleOption(group, opt.name)}
                    className={`p-2 text-sm border rounded-xl text-left transition-all ${
                      isOptionSelected(group, opt.name)
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:border-amber-300"
                    }`}
                  >
                    {opt.name}
                    {opt.extraCost > 0 && (
                      <span className="text-xs ml-1 opacity-70">
                        +${opt.extraCost.toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2 hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-semibold">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="px-3 py-2 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={requiredMissing > 0 || added}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                added
                  ? "bg-green-500 text-white"
                  : requiredMissing > 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              {added ? "✓ Added!" : `Add to Cart — $${total.toFixed(2)}`}
            </button>
          </div>
          {requiredMissing > 0 && (
            <p className="text-xs text-red-400 mt-2">
              Please select required options above
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [popular, setPopular] = useState<MenuItem[]>([]);
  const { addItem, totalItems } = useCart();
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<MenuItem | null>(null);

  useEffect(() => {
    getDoc(doc(db, "settings", "restaurant")).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as RestaurantSettings);
    });
    getDocs(
      query(
        collection(db, "menu_items"),
        where("featured", "==", true),
        where("available", "==", true),
      ),
    ).then((snap) =>
      setPopular(
        snap.docs
          .slice(0, 6)
          .map((d) => ({ id: d.id, ...d.data() }) as MenuItem),
      ),
    );
  }, []);

  const handleAddFromModal = (
    item: MenuItem,
    qty: number,
    options: Record<string, string | string[]>,
  ) => {
    const extraCost =
      item.optionGroups?.reduce((sum, g) => {
        const sel = options[g.label];
        if (Array.isArray(sel)) {
          return (
            sum +
            sel.reduce((s, name) => {
              const opt = g.options.find((o) => o.name === name);
              return s + (opt?.extraCost ?? 0);
            }, 0)
          );
        }
        const opt = g.options.find((o) => o.name === sel);
        return sum + (opt?.extraCost ?? 0);
      }, 0) ?? 0;
    addItem(
      {
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        unitPrice: item.price + extraCost,
        selectedOptions: options,
      },
      qty,
    );
  };

  const handleQuickAdd = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.price,
    });
    setAddedKeys((prev) => new Set(prev).add(item.id));
    setTimeout(
      () =>
        setAddedKeys((prev) => {
          const s = new Set(prev);
          s.delete(item.id);
          return s;
        }),
      1500,
    );
  };

  return (
    <>
      <Navbar />
      <div className="pt-16">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 relative">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 fill-white" />
                <span className="text-sm font-medium opacity-90">
                  Top Rated Restaurant
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
                {settings?.name ?? "Fresh & Delicious"}
              </h1>
              <p className="text-lg opacity-90 mb-8">
                Order your favourite dishes online for walk-in or delivery.
                Fresh ingredients, made with love.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/menu"
                  className="px-8 py-3 bg-white text-amber-600 hover:bg-amber-50 font-bold rounded-xl text-center shadow-lg"
                >
                  Order Now
                </Link>
                <Link
                  href="/menu"
                  className="px-8 py-3 border-2 border-white text-white hover:bg-white/10 font-bold rounded-xl text-center"
                >
                  View Menu
                </Link>
              </div>
            </div>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-16 bg-gray-50"
            style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }}
          />
        </section>

        {/* Popular dishes */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800">
                Popular Dishes
              </h2>
              <p className="text-gray-500 mt-2">
                Our most loved items — tried by hundreds of happy customers
              </p>
            </div>
            {popular.length === 0 ? (
              <p className="text-center text-gray-400">
                No featured items yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {popular.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-stretch overflow-hidden"
                  >
                    {/* Content */}
                    <div
                      className="flex-1 text-left p-4 flex flex-col justify-between min-w-0 cursor-pointer"
                      onClick={() => setSelected(item)}
                    >
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1">
                          {item.name}
                        </h3>
                        {item.dietaryTags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {item.dietaryTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full capitalize"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold text-amber-600 text-sm">
                          ${item.price.toFixed(2)}
                        </p>
                        {item.optionGroups?.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(item);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold rounded-lg"
                          >
                            Customize
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAdd(item);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full font-bold transition-all ${
                              addedKeys.has(item.id)
                                ? "bg-green-500 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}
                          >
                            {addedKeys.has(item.id) ? (
                              <span className="text-xs">✓</span>
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image */}
                    <button
                      className="relative flex-shrink-0 w-28 sm:w-36 bg-amber-50 block rounded-r-2xl overflow-hidden"
                      onClick={() => setSelected(item)}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-3xl">
                          🍽️
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-center mt-8">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 font-medium rounded-xl"
              >
                Browse Full Menu →
              </Link>
            </div>
          </div>
        </section>

        {/* Info */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Find Us
                </h2>
                <div className="space-y-4">
                  {settings?.address && (
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-medium">
                          Address
                        </p>
                        <p className="text-gray-800">{settings.address}</p>
                      </div>
                    </div>
                  )}
                  {settings?.phone && (
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-medium">
                          Phone
                        </p>
                        <a
                          href={`tel:${settings.phone}`}
                          className="text-gray-800 hover:text-amber-600"
                        >
                          {settings.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 rounded-2xl bg-amber-50 h-48 flex items-center justify-center border border-amber-100">
                  {settings?.address ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:underline text-sm flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" /> View on Google Maps
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      Map will appear here
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  <Clock className="inline w-6 h-6 mr-2 text-amber-500" />
                  Opening Hours
                </h2>
                <div className="space-y-2">
                  {settings?.hours ? (
                    DAYS.map((day) => {
                      const h = settings.hours[day];
                      return (
                        <div
                          key={day}
                          className="flex justify-between py-2 border-b border-gray-50"
                        >
                          <span className="text-gray-600 font-medium">
                            {DAY_NAMES[day]}
                          </span>
                          {h?.closed ? (
                            <span className="text-red-400 text-sm font-medium">
                              Closed
                            </span>
                          ) : (
                            <span className="text-gray-800 text-sm">
                              {h?.open} – {h?.close}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Hours not configured.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-amber-500 py-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to order?
          </h2>
          <p className="opacity-90 mb-6">
            Walk in or get it delivered — we&apos;ve got you covered.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-amber-600 font-bold rounded-xl hover:bg-amber-50"
          >
            <ShoppingCart className="w-5 h-5" /> Order Now
          </Link>
        </section>

        <footer className="bg-gray-800 text-gray-400 py-8 text-center text-sm">
          <p>
            © {new Date().getFullYear()} {settings?.name ?? "FoodOrder"}. All
            rights reserved.
          </p>
        </footer>
      </div>

      {/* Floating cart */}
      {totalItems > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl shadow-xl font-medium z-40"
        >
          <ShoppingCart className="w-5 h-5" />
          View Cart ({totalItems})
        </Link>
      )}

      {/* Food detail modal */}
      {selected && (
        <FoodDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onAdd={handleAddFromModal}
        />
      )}
    </>
  );
}
