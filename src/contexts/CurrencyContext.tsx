"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CurrencyContextValue {
  symbol: string;
  fmt: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  symbol: "$",
  fmt: (n) => `$${n.toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [symbol, setSymbol] = useState("$");

  useEffect(() => {
    getDoc(doc(db, "settings", "restaurant")).then((snap) => {
      if (snap.exists()) {
        const s = snap.data()?.currency as string | undefined;
        if (s) setSymbol(s);
      }
    });
  }, []);

  const fmt = (amount: number) => `${symbol}${amount.toFixed(2)}`;

  return (
    <CurrencyContext.Provider value={{ symbol, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
