"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/guards/AdminGuard";
import AdminSidebar from "@/components/admin/Sidebar";
import { Menu } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login page renders on its own without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — always visible on md+, slide-in on mobile */}
        <div
          className={`fixed inset-y-0 left-0 z-40 md:relative md:block transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <AdminSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 bg-gray-900 px-4 py-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white p-1"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-white font-semibold text-sm">
              🍽️ Admin Panel
            </span>
          </div>
          <main className="flex-1 overflow-y-auto bg-gray-100 text-gray-900">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
