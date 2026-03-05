"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Truck, Wallet } from "lucide-react";

const NAV = [
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/cashier", label: "Cashier", icon: Wallet },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function DeliveryBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 flex md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-amber-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${active ? "text-amber-400" : "text-gray-400"}`}
            />
            {label}
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-400 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
