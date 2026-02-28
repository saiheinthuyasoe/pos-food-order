"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/customer/Navbar";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuth = pathname === "/auth";

  return (
    <>
      {!isAuth && <Navbar />}
      <Suspense>
        <main
          className={
            !isAuth ? "pt-16 min-h-screen bg-gray-50 text-gray-900" : ""
          }
        >
          {children}
        </main>
      </Suspense>
    </>
  );
}
