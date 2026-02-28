"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PromoCode } from "@/types";
import { Plus, Trash2, X } from "lucide-react";

const EMPTY_FORM = {
  code: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountAmount: 0,
  minOrderValue: 0,
  usageLimit: 0,
  expiryDate: "",
  active: true,
};

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "promo_codes"), orderBy("code"));
    return onSnapshot(q, (snap) =>
      setPromos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PromoCode)),
    );
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };
  const close = () => setShowModal(false);

  const handleSave = async () => {
    setSaving(true);
    const payload: Omit<PromoCode, "id" | "usageCount"> = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountAmount: Number(form.discountAmount),
      minOrderValue: Number(form.minOrderValue),
      usageLimit: Number(form.usageLimit),
      expiryDate: form.expiryDate
        ? Timestamp.fromDate(new Date(form.expiryDate))
        : null,
      active: form.active,
    };
    await addDoc(collection(db, "promo_codes"), { ...payload, usageCount: 0 });
    setSaving(false);
    close();
  };

  const toggleActive = (p: PromoCode) =>
    updateDoc(doc(db, "promo_codes", p.id), { active: !p.active });

  const remove = (id: string) => {
    if (confirm("Delete this promo code?"))
      deleteDoc(doc(db, "promo_codes", id));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Promo Codes</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {promos.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No promo codes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {[
                  "Code",
                  "Type",
                  "Amount",
                  "Min Order",
                  "Usage",
                  "Expiry",
                  "Active",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-gray-500 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">
                    {p.code}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {p.discountType}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {p.discountType === "percentage"
                      ? `${p.discountAmount}%`
                      : `$${p.discountAmount}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    ${p.minOrderValue}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.usageCount} {p.usageLimit ? `/ ${p.usageLimit}` : "/ ∞"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.expiryDate
                      ? (p.expiryDate as Timestamp)
                          .toDate()
                          .toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        p.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(p.id)}>
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800">
                New Promo Code
              </h2>
              <button onClick={close}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Code">
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="input"
                  placeholder="SUMMER20"
                />
              </Field>
              <Field label="Discount Type">
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountType: e.target.value as "percentage" | "fixed",
                    })
                  }
                  className="input"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </Field>
              <Field
                label={
                  form.discountType === "percentage"
                    ? "Discount %"
                    : "Discount Amount ($)"
                }
              >
                <input
                  type="number"
                  min={0}
                  value={form.discountAmount}
                  onChange={(e) =>
                    setForm({ ...form, discountAmount: +e.target.value })
                  }
                  className="input"
                />
              </Field>
              <Field label="Min Order Value ($)">
                <input
                  type="number"
                  min={0}
                  value={form.minOrderValue}
                  onChange={(e) =>
                    setForm({ ...form, minOrderValue: +e.target.value })
                  }
                  className="input"
                />
              </Field>
              <Field label="Usage Limit (0 = unlimited)">
                <input
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={(e) =>
                    setForm({ ...form, usageLimit: +e.target.value })
                  }
                  className="input"
                />
              </Field>
              <Field label="Expiry Date">
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm({ ...form, expiryDate: e.target.value })
                  }
                  className="input"
                />
              </Field>
              <div className="flex items-center gap-3">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="w-4 h-4 accent-amber-500"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Active immediately
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={close}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code}
                className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create Code"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          outline: none;
        }
        .input:focus {
          border-color: #f59e0b;
        }
      `}</style>
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
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      {children}
    </div>
  );
}
