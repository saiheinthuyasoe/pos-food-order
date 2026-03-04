"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Customer, SavedAddress } from "@/types";
import { Plus, Trash2, MapPin, Check, ExternalLink } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Address form
  const [newAddr, setNewAddr] = useState({
    label: "Home",
    address: "",
    apartment: "",
    mapsUrl: "",
  });
  const [addingAddr, setAddingAddr] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Customer;
        setCustomer({ ...data, id: snap.id });
        setForm({ name: data.name ?? "", phone: data.phone ?? "" });
      } else {
        setForm({ name: user.displayName ?? "", phone: "" });
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const data = {
      name: form.name,
      phone: form.phone,
      email: user.email!,
      uid: user.uid,
      savedAddresses: customer?.savedAddresses ?? [],
      createdAt: customer?.createdAt ?? Timestamp.now(),
    };
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    setCustomer((prev) =>
      prev ? { ...prev, ...data } : { id: user.uid, ...data },
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    await sendPasswordResetEmail(auth, user.email);
    setResetSent(true);
    setTimeout(() => setResetSent(false), 5000);
  };

  const addAddress = async () => {
    if (!user || !newAddr.address) return;
    const addr: SavedAddress = {
      id: crypto.randomUUID(),
      label: newAddr.label,
      address: newAddr.address,
      ...(newAddr.apartment ? { apartment: newAddr.apartment } : {}),
      ...(newAddr.mapsUrl ? { mapsUrl: newAddr.mapsUrl } : {}),
      isDefault: (customer?.savedAddresses ?? []).length === 0,
    };
    const updated = [...(customer?.savedAddresses ?? []), addr];
    await setDoc(
      doc(db, "users", user.uid),
      { savedAddresses: updated },
      { merge: true },
    );
    setCustomer((prev) => (prev ? { ...prev, savedAddresses: updated } : null));
    setNewAddr({ label: "Home", address: "", apartment: "", mapsUrl: "" });
    setAddingAddr(false);
  };

  const removeAddress = async (id: string) => {
    if (!user) return;
    const updated = (customer?.savedAddresses ?? []).filter((a) => a.id !== id);
    await setDoc(
      doc(db, "users", user.uid),
      { savedAddresses: updated },
      { merge: true },
    );
    setCustomer((prev) => (prev ? { ...prev, savedAddresses: updated } : null));
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    const updated = (customer?.savedAddresses ?? []).map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    await setDoc(
      doc(db, "users", user.uid),
      { savedAddresses: updated },
      { merge: true },
    );
    setCustomer((prev) => (prev ? { ...prev, savedAddresses: updated } : null));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>

      {/* Profile form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl">
            {form.name?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              "U"}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {form.name || "Customer"}
            </p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Full Name
            </label>
            <input
              title="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Phone
            </label>
            <input
              title="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="+1 555 000 0000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Email
            </label>
            <input
              title="Email"
              value={user?.email ?? ""}
              disabled
              className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2 text-sm font-medium rounded-xl transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            } disabled:opacity-50`}
          >
            {saved ? (
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved!
              </span>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            onClick={handleResetPassword}
            className="px-5 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            {resetSent ? "Email sent ✓" : "Change Password"}
          </button>
        </div>
      </div>

      {/* Saved addresses */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" /> Saved Addresses
          </h2>
          <button
            onClick={() => setAddingAddr(!addingAddr)}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-50"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {addingAddr && (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">
                  Label
                </label>
                <select
                  title="New Address"
                  value={newAddr.label}
                  onChange={(e) =>
                    setNewAddr((n) => ({ ...n, label: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400 bg-white"
                >
                  {["Home", "Work", "Other"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex-[3]">
                <label className="text-xs text-gray-500 block mb-1">
                  Full Address *
                </label>
                <input
                  value={newAddr.address}
                  onChange={(e) =>
                    setNewAddr((n) => ({ ...n, address: e.target.value }))
                  }
                  placeholder="123 Main St, City"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Apartment / Floor
                </label>
                <input
                  value={newAddr.apartment}
                  onChange={(e) =>
                    setNewAddr((n) => ({ ...n, apartment: e.target.value }))
                  }
                  placeholder="Apt 4B, Floor 2"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  Google Maps Link
                </label>
                <input
                  value={newAddr.mapsUrl}
                  onChange={(e) =>
                    setNewAddr((n) => ({ ...n, mapsUrl: e.target.value }))
                  }
                  placeholder="https://maps.google.com/..."
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addAddress}
                disabled={!newAddr.address}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setAddingAddr(false)}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {(customer?.savedAddresses ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No saved addresses yet.</p>
        ) : (
          <div className="space-y-2">
            {customer!.savedAddresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-3 rounded-xl border ${
                  addr.isDefault
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-700">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 break-words">
                      {addr.address}
                    </p>
                    {addr.apartment && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {addr.apartment}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {addr.mapsUrl && (
                      <a
                        href={addr.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {!addr.isDefault && (
                      <button
                        onClick={() => setDefault(addr.id)}
                        className="text-[10px] text-amber-600 hover:underline"
                      >
                        Set default
                      </button>
                    )}
                    <button 
                      title="Remove Address"
                      onClick={() => removeAddress(addr.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
