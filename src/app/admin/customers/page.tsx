"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer } from "@/types";
import { Search, X, ExternalLink } from "lucide-react";

interface CustomerStats {
  orderCount: number;
  totalSpent: number;
}

const PAGE_SIZE = 15;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<string, CustomerStats>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, "users"), orderBy("name"))).then(
      async (snap) => {
        const custs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Customer,
        );
        setCustomers(custs);

        // Fetch order count + total for each customer
        const statMap: Record<string, CustomerStats> = {};
        await Promise.all(
          custs.map(async (c) => {
            const ordersSnap = await getDocs(
              query(collection(db, "orders"), where("customerId", "==", c.id)),
            );
            const total = ordersSnap.docs.reduce(
              (sum, d) => sum + ((d.data().total as number) ?? 0),
              0,
            );
            statMap[c.id] = { orderCount: ordersSnap.size, totalSpent: total };
          }),
        );
        setStats(statMap);
        setLoading(false);
      },
    );
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Customers</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-400 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400 text-sm">No customers found.</p>
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
                    Orders
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">
                    Total Spent
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {c.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.email}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {stats[c.id]?.orderCount ?? "…"}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      ${(stats[c.id]?.totalSpent ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders?customerId=${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-amber-600 hover:underline flex items-center gap-1"
                      >
                        Orders <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination footer */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <div className="w-72 bg-white rounded-xl shadow-sm p-5 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Customer Detail</h2>
              <button onClick={() => setSelected(null)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <Detail label="Name" value={selected.name || "—"} />
              <Detail label="Email" value={selected.email} />
              <Detail label="Phone" value={selected.phone || "—"} />
              <Detail
                label="Orders"
                value={String(stats[selected.id]?.orderCount ?? 0)}
              />
              <Detail
                label="Total Spent"
                value={`$${(stats[selected.id]?.totalSpent ?? 0).toFixed(2)}`}
              />
              <Detail
                label="Member Since"
                value={selected.createdAt?.toDate().toLocaleDateString() ?? "—"}
              />
            </div>
            {selected.savedAddresses?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Saved Addresses
                </p>
                {selected.savedAddresses.map((a) => (
                  <div key={a.id} className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">{a.label}:</span> {a.address}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}
