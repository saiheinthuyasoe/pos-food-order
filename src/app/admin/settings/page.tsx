"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  RestaurantSettings,
  DayHours,
  NotificationSettings,
  NotificationSoundType,
} from "@/types";
import { playNotificationSound } from "@/lib/notificationSound";
import { Save, Bell, Volume2, Upload, X } from "lucide-react";

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

const CURRENCIES = [
  { symbol: "$", label: "$ USD — US Dollar" },
  { symbol: "€", label: "€ EUR — Euro" },
  { symbol: "£", label: "£ GBP — British Pound" },
  { symbol: "¥", label: "¥ JPY — Japanese Yen" },
  { symbol: "฿", label: "฿ THB — Thai Baht" },
  { symbol: "S$", label: "S$ SGD — Singapore Dollar" },
  { symbol: "RM", label: "RM MYR — Malaysian Ringgit" },
  { symbol: "A$", label: "A$ AUD — Australian Dollar" },
  { symbol: "C$", label: "C$ CAD — Canadian Dollar" },
  { symbol: "₩", label: "₩ KRW — Korean Won" },
];

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
  currency: "$",
  promptPayQrUrl: "",
};

const NOTIFICATION_DEFAULTS: NotificationSettings = {
  soundEnabled: true,
  volume: 70,
  soundType: "ding",
  newOrderAlert: true,
  readyAlert: false,
};

const SOUND_OPTIONS: {
  value: NotificationSoundType;
  label: string;
  desc: string;
}[] = [
  { value: "ding", label: "Ding", desc: "Two soft ascending tones" },
  { value: "chime", label: "Chime", desc: "Three-note pleasant chime" },
  { value: "alert", label: "Alert", desc: "Triple sharp beep" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULTS);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    NOTIFICATION_DEFAULTS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrError, setQrError] = useState("");
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrUploading(true);
    setQrError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/qr", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      const { url } = await res.json();
      update("promptPayQrUrl", url);
      if (qrInputRef.current) qrInputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setQrError(msg);
    } finally {
      setQrUploading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, "settings", "restaurant")),
      getDoc(doc(db, "settings", "notifications")),
    ]).then(([restSnap, notifSnap]) => {
      if (restSnap.exists())
        setSettings({ ...DEFAULTS, ...restSnap.data() } as RestaurantSettings);
      if (notifSnap.exists())
        setNotifSettings({
          ...NOTIFICATION_DEFAULTS,
          ...notifSnap.data(),
        } as NotificationSettings);
      setLoading(false);
    });
  }, []);

  const update = (field: keyof RestaurantSettings, value: unknown) =>
    setSettings((s) => ({ ...s, [field]: value }));

  const updateNotif = (field: keyof NotificationSettings, value: unknown) =>
    setNotifSettings((s) => ({ ...s, [field]: value }));

  const updateHours = (day: string, field: keyof DayHours, value: unknown) =>
    setSettings((s) => ({
      ...s,
      hours: { ...s.hours, [day]: { ...s.hours[day], [field]: value } },
    }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await Promise.all([
      setDoc(doc(db, "settings", "restaurant"), settings),
      setDoc(doc(db, "settings", "notifications"), notifSettings),
    ]);
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
                    title="Time"
                    type="time"
                    value={settings.hours[day]?.open ?? "09:00"}
                    onChange={(e) => updateHours(day, "open", e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    title="Time"
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

      {/* Currency */}
      <Section title="Currency">
        <Field label="Display Currency">
          <select
            title="Currency"
            value={settings.currency ?? "$"}
            onChange={(e) => update("currency", e.target.value)}
            className={inputCls}
          >
            {CURRENCIES.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-gray-400 mt-1">
          This symbol is shown across the entire app — admin and customer pages.
        </p>
      </Section>

      {/* PromptPay */}
      <Section title="PromptPay (Scan QR Payment)">
        <Field label="QR Code Image">
          <div className="space-y-3">
            {settings.promptPayQrUrl && (
              <div className="relative w-36">
                <img
                  src={settings.promptPayQrUrl}
                  alt="PromptPay QR"
                  className="w-36 h-36 object-contain rounded-xl border border-gray-200 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => update("promptPayQrUrl", "")}
                  className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 text-gray-400 hover:text-red-500 shadow-sm"
                  title="Remove QR code"
                  aria-label="Remove QR code"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <label
              className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-amber-400 hover:text-amber-700 transition-colors ${
                qrUploading ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <Upload className="w-4 h-4" />
              {qrUploading
                ? "Uploading…"
                : settings.promptPayQrUrl
                  ? "Replace QR Image"
                  : "Upload QR Image"}
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
            </label>
            {qrError && <p className="text-xs text-red-500 mt-1">{qrError}</p>}
          </div>
        </Field>
        <p className="text-xs text-gray-400 mt-1">
          Upload your PromptPay QR code image. It will be shown to customers
          when they choose Scan QR at delivery checkout.
        </p>
      </Section>

      {/* Delivery & Pricing */}
      <Section title="Delivery & Pricing">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery Radius (km)">
            <input
              title="Delivery Radius"
              type="number"
              min={0}
              value={settings.deliveryRadius}
              onChange={(e) => update("deliveryRadius", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Min Order Amount ($)">
            <input
              title="Minimum Order Amount"
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
              title="Delivery Fee"
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
              title="Tax Rate"
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
              title="Walk-in Preparation Time"
              type="number"
              min={0}
              value={settings.prepTimeWalkIn}
              onChange={(e) => update("prepTimeWalkIn", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Delivery Prep Time (min)">
            <input
              title="Delivery Preparation Time"
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

      {/* Notifications */}
      <Section title="Notifications">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Order Alert Sound
              </p>
              <p className="text-xs text-gray-400">
                Play a sound when new orders arrive on the Orders page
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updateNotif("soundEnabled", !notifSettings.soundEnabled)
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifSettings.soundEnabled ? "bg-amber-500" : "bg-gray-300"
            }`}
            title="Toggle notification sound"
            aria-label="Toggle notification sound"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                notifSettings.soundEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {notifSettings.soundEnabled && (
          <div className="space-y-5">
            {/* Alert triggers */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Play when
              </p>
              <div className="space-y-2">
                {(
                  [
                    {
                      key: "newOrderAlert" as const,
                      label: "New order placed (pending)",
                      desc: "Customer places an order",
                    },
                    {
                      key: "readyAlert" as const,
                      label: "Order status changes to Ready",
                      desc: "Kitchen marks order ready",
                    },
                  ] as {
                    key: keyof NotificationSettings;
                    label: string;
                    desc: string;
                  }[]
                ).map(({ key, label, desc }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {label}
                      </p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifSettings[key] as boolean}
                      onChange={(e) => updateNotif(key, e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Sound type */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Sound style
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SOUND_OPTIONS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      updateNotif("soundType", value);
                      playNotificationSound({
                        type: value,
                        volume: notifSettings.volume,
                      });
                    }}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                      notifSettings.soundType === value
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        notifSettings.soundType === value
                          ? "text-amber-700"
                          : "text-gray-700"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Click a style to preview
              </p>
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Volume
                </p>
                <span className="text-sm font-medium text-gray-700">
                  {notifSettings.volume}%
                </span>
              </div>
              <input
                title="Range"
                type="range"
                min={10}
                max={100}
                step={5}
                value={notifSettings.volume}
                onChange={(e) => updateNotif("volume", Number(e.target.value))}
                onMouseUp={() =>
                  playNotificationSound({
                    type: notifSettings.soundType,
                    volume: notifSettings.volume,
                  })
                }
                onTouchEnd={() =>
                  playNotificationSound({
                    type: notifSettings.soundType,
                    volume: notifSettings.volume,
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        )}
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
