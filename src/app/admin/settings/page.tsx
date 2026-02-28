"use client";

import { useEffect, useState, FormEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RestaurantSettings, DayHours } from "@/types";
import { Save } from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DEFAULT_HOURS: DayHours = {
  open: "09:00",
  close: "22:00",
  closed: false,
};

const DEFAULTS: RestaurantSettings = {
  name: "",
  address: "",
  phone: "",
  logoUrl: "",
  hours: Object.fromEntries(DAYS.map((d) => [d, { ...DEFAULT_HOURS }])),
  deliveryRadius: 10,
  minOrderAmount: 15,
  deliveryFee: 3,
  taxRate: 7,
  prepTimeWalkIn: 20,
  prepTimeDelivery: 45,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "restaurant")).then((snap) => {
      if (snap.exists())
        setSettings({ ...DEFAULTS, ...snap.data() } as RestaurantSettings);
      setLoading(false);
    });
  }, []);

  const update = (field: keyof RestaurantSettings, value: unknown) =>
    setSettings((s) => ({ ...s, [field]: value }));

  const updateHours = (day: string, field: keyof DayHours, value: unknown) =>
    setSettings((s) => ({
      ...s,
      hours: { ...s.hours, [day]: { ...s.hours[day], [field]: value } },
    }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, "settings", "restaurant"), settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading)
    return <div className="p-6 text-gray-400">Loading settings…</div>;

  return (
    <form onSubmit={handleSave} className="p-6 max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>

      {/* Restaurant Info */}
      <Section title="Restaurant Info">
        <Field label="Restaurant Name">
          <input
            value={settings.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputCls}
            placeholder="My Restaurant"
            required
          />
        </Field>
        <Field label="Address">
          <input
            value={settings.address}
            onChange={(e) => update("address", e.target.value)}
            className={inputCls}
            placeholder="123 Main St, City"
          />
        </Field>
        <Field label="Phone">
          <input
            value={settings.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputCls}
            placeholder="+1 234 567 8900"
          />
        </Field>
      </Section>

      {/* Opening Hours */}
      <Section title="Opening Hours">
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-600">
                {DAY_LABELS[day]}
              </span>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={!settings.hours[day]?.closed}
                  onChange={(e) =>
                    updateHours(day, "closed", !e.target.checked)
                  }
                  className="rounded"
                />
                Open
              </label>
              {!settings.hours[day]?.closed && (
                <>
                  <input
                    type="time"
                    value={settings.hours[day]?.open ?? "09:00"}
                    onChange={(e) => updateHours(day, "open", e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="time"
                    value={settings.hours[day]?.close ?? "22:00"}
                    onChange={(e) => updateHours(day, "close", e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </>
              )}
              {settings.hours[day]?.closed && (
                <span className="text-xs text-red-500">Closed</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Delivery & Pricing */}
      <Section title="Delivery & Pricing">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery Radius (km)">
            <input
              type="number"
              min={0}
              value={settings.deliveryRadius}
              onChange={(e) => update("deliveryRadius", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Min Order Amount ($)">
            <input
              type="number"
              min={0}
              step={0.01}
              value={settings.minOrderAmount}
              onChange={(e) => update("minOrderAmount", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Delivery Fee ($)">
            <input
              type="number"
              min={0}
              step={0.01}
              value={settings.deliveryFee}
              onChange={(e) => update("deliveryFee", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Tax Rate (%)">
            <input
              type="number"
              min={0}
              step={0.1}
              value={settings.taxRate}
              onChange={(e) => update("taxRate", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Walk-in Prep Time (min)">
            <input
              type="number"
              min={0}
              value={settings.prepTimeWalkIn}
              onChange={(e) => update("prepTimeWalkIn", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Delivery Prep Time (min)">
            <input
              type="number"
              min={0}
              value={settings.prepTimeDelivery}
              onChange={(e) =>
                update("prepTimeDelivery", Number(e.target.value))
              }
              className={inputCls}
            />
          </Field>
        </div>
      </Section>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
