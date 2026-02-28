"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Routes accessible per role (prefix matching)
const ROLE_ALLOWED_PREFIXES: Record<string, string[]> = {
  kitchen: ["/admin/dashboard", "/admin/orders"],
  delivery: ["/admin/dashboard", "/admin/orders", "/admin/delivery"],
};

function isAllowed(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

/**
 * Wrap any admin page with this component.
 * It provides a client-side check in addition to the middleware cookie check.
 */
export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, adminRole, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user || !isAdmin) {
      router.replace("/admin/login");
      return;
    }

    // Role-based route protection for non-super_admin roles
    if (adminRole && adminRole !== "super_admin") {
      const allowed = ROLE_ALLOWED_PREFIXES[adminRole] ?? [];
      if (!isAllowed(pathname, allowed)) {
        router.replace("/admin/orders");
      }
    }
  }, [user, isAdmin, adminRole, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  // Block render until role-based redirect fires
  if (adminRole && adminRole !== "super_admin") {
    const allowed = ROLE_ALLOWED_PREFIXES[adminRole] ?? [];
    if (!isAllowed(pathname, allowed)) return null;
  }

  return <>{children}</>;
}
