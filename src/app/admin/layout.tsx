"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import AdminGuard from "@/components/guards/AdminGuard";
import AdminSidebar from "@/components/admin/Sidebar";
import DeliveryBottomNav from "@/components/admin/DeliveryBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Menu, LogOut } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { adminRole, signOut, user } = useAuth();
  const { name: restaurantName, logoUrl: restaurantLogo } = useRestaurant();

  // Login page renders on its own without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const isDelivery = adminRole === "delivery";

  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden" suppressHydrationWarning>
        {/* Mobile overlay backdrop — not needed for delivery (no sidebar) */}
        {sidebarOpen && !isDelivery && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — hidden on mobile for delivery role */}
        <div
          className={`fixed inset-y-0 left-0 z-40 md:relative md:block transition-transform duration-200 ${
            isDelivery
              ? "hidden md:block"
              : sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full md:translate-x-0"
          }`}
        >
          <AdminSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar — show hamburger for non-delivery; simple title bar for delivery */}
          {isDelivery ? (
            <div className="md:hidden flex items-center justify-between bg-gray-900 px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                {restaurantLogo ? (
                  <Image
                    src={restaurantLogo}
                    alt="Logo"
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-lg">🍽️</span>
                )}
                <span className="text-white font-semibold text-sm">
                  {restaurantName || "FoodOrder"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Account info */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(user?.displayName ?? user?.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="leading-none">
                    <p className="text-white text-xs font-semibold truncate max-w-[100px]">
                      {user?.displayName ?? user?.email?.split("@")[0] ?? ""}
                    </p>
                    <p className="text-gray-400 text-[10px] capitalize">
                      {adminRole}
                    </p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="text-gray-400 hover:text-white p-1 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="md:hidden flex items-center justify-between bg-gray-900 px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-white p-1"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  {restaurantLogo ? (
                    <Image
                      src={restaurantLogo}
                      alt="Logo"
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-lg">🍽️</span>
                  )}
                  <span className="text-white font-semibold text-sm">
                    {restaurantName || "Admin Panel"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Account info */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(user?.displayName ?? user?.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="leading-none">
                    <p className="text-white text-xs font-semibold truncate max-w-[80px]">
                      {user?.displayName ?? user?.email?.split("@")[0] ?? ""}
                    </p>
                    <p className="text-gray-400 text-[10px] capitalize">
                      {adminRole}
                    </p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="text-gray-400 hover:text-white p-1 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Extra bottom padding on mobile for delivery bottom nav */}
          <main
            className={`flex-1 overflow-y-auto bg-gray-100 text-gray-900 ${
              isDelivery ? "pb-16 md:pb-0" : ""
            }`}
          >
            {children}
          </main>
        </div>

        {/* Bottom nav — delivery role, mobile only */}
        {isDelivery && <DeliveryBottomNav />}
      </div>
    </AdminGuard>
  );
}
