"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RestaurantBrand {
  name: string;
  logoUrl: string;
  loaded: boolean;
}

const RestaurantContext = createContext<RestaurantBrand>({
  name: "",
  logoUrl: "",
  loaded: false,
});

export function RestaurantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brand, setBrand] = useState<RestaurantBrand>({
    name: "",
    logoUrl: "",
    loaded: false,
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "restaurant"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBrand({
          name: (data.name as string) || "",
          logoUrl: (data.logoUrl as string) || "",
          loaded: true,
        });
      } else {
        // Doc doesn't exist yet — still mark loaded so default is shown
        setBrand({ name: "", logoUrl: "", loaded: true });
      }
    });
    return unsub;
  }, []);

  return (
    <RestaurantContext.Provider value={brand}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}
