"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StaffMember, StaffRole } from "@/types";
import { Plus, X, UserCheck, UserX } from "lucide-react";

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  kitchen: "Kitchen",
  delivery: "Delivery",
  cashier: "Cashier",
};

const ROLE_COLORS: Record<StaffRole, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  kitchen: "bg-orange-100 text-orange-700",
  delivery: "bg-blue-100 text-blue-700",
  cashier: "bg-green-100 text-green-700",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // New staff form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("kitchen");

  const fetchStaff = async () => {
    const snap = await getDocs(
      query(collection(db, "admins"), orderBy("name")),
    );
    setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffMember));
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create staff.");
      setShowForm(false);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("kitchen");
      fetchStaff();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error creating staff account.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    await updateDoc(doc(db, "admins", member.id), { active: !member.active });
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, active: !s.active } : s)),
    );
  };

  const changeRole = async (member: StaffMember, newRole: StaffRole) => {
    await updateDoc(doc(db, "admins", member.id), { role: newRole });
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, role: newRole } : s)),
    );
  };

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Add Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Add New Staff</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                title="Close"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Requires <code>FIREBASE_ADMIN_SERVICE_ACCOUNT</code> to be set in
              your .env.local.
            </p>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={inputCls}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className={inputCls}
              />
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className={inputCls}
              />
              <select
                title="Staff Role"
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className={inputCls}
              >
                <option value="super_admin">Super Admin</option>
                <option value="kitchen">Kitchen</option>
                <option value="delivery">Delivery</option>
                <option value="cashier">Cashier</option>
              </select>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {submitting ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No staff accounts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{member.email}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {member.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      title="Change Role"
                      value={member.role}
                      onChange={(e) =>
                        changeRole(member, e.target.value as StaffRole)
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium border-0 cursor-pointer ${ROLE_COLORS[member.role]}`}
                    >
                      {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${member.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(member)}
                      title={
                        member.active ? "Deactivate staff" : "Activate staff"
                      }
                      aria-label={
                        member.active
                          ? `Deactivate ${member.name}`
                          : `Activate ${member.name}`
                      }
                      className={`flex items-center gap-1 text-xs font-medium ${member.active ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}
                    >
                      {member.active ? (
                        <>
                          <UserX className="w-3.5 h-3.5" /> Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Activate
                        </>
                      )}
                    </button>
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
