"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Tag,
  LayoutGrid,
  Truck,
  Users,
  UserCircle,
  Tags,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  X,
  Wallet,
  Receipt,
  FileBarChart2,
} from "lucide-react";

import { AdminRole } from "@/contexts/AuthContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: AdminRole[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "kitchen", "delivery"],
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ClipboardList,
    roles: ["super_admin", "kitchen", "delivery", "cashier"],
  },
  {
    href: "/admin/delivery",
    label: "Delivery",
    icon: Truck,
    roles: ["super_admin", "delivery"],
  },
  {
    href: "/admin/menu",
    label: "Menu",
    icon: UtensilsCrossed,
    roles: ["super_admin"],
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Tag,
    roles: ["super_admin"],
  },

  {
    href: "/admin/cashier",
    label: "Cashier",
    icon: Wallet,
    roles: ["super_admin", "cashier", "delivery"],
  },

  {
    href: "/admin/payments",
    label: "Payments",
    icon: CreditCard,
    roles: ["super_admin"],
  },

  {
    href: "/admin/expenses",
    label: "Expenses",
    icon: Receipt,
    roles: ["super_admin"],
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    icon: FileBarChart2,
    roles: ["super_admin"],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["super_admin"],
  },
  {
    href: "/admin/tables",
    label: "Tables",
    icon: LayoutGrid,
    roles: ["super_admin"],
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: Users,
    roles: ["super_admin"],
  },

  {
    href: "/admin/customers",
    label: "Customers",
    icon: UserCircle,
    roles: ["super_admin"],
  },
  {
    href: "/admin/promo-codes",
    label: "Promo Codes",
    icon: Tags,
    roles: ["super_admin"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["super_admin"],
  },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, adminRole, signOut } = useAuth();
  const { name, logoUrl } = useRestaurant();

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              unoptimized
            />
          ) : (
            <span className="text-2xl flex-shrink-0">🍽️</span>
          )}
          <span className="text-white font-bold text-lg leading-tight truncate">
            {name || "FoodOrder"}
            <br />
            <span className="text-xs font-normal text-gray-400">
              Admin Panel
            </span>
          </span>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.filter((item) =>
          adminRole ? item.roles.includes(adminRole) : false,
        ).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-500 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-1 truncate">{user?.email}</div>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-amber-900/50 text-amber-400 px-2 py-0.5 text-xs font-medium capitalize">
            {adminRole?.replace("_", " ")}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
