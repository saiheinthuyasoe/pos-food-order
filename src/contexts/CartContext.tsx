"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface CartItem {
  cartItemKey: string; // unique: menuItemId + stringified selectedOptions
  menuItemId: string;
  name: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  selectedOptions?: Record<string, string | string[]>; // groupLabel → optionName or option names
}

interface CartContextValue {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "cartItemKey" | "quantity">,
    quantity?: number,
  ) => void;
  removeItem: (cartItemKey: string) => void;
  updateQuantity: (cartItemKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage only on client
  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore corrupt data
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = (
    item: Omit<CartItem, "cartItemKey" | "quantity">,
    quantity = 1,
  ) => {
    const cartItemKey = `${item.menuItemId}-${JSON.stringify(item.selectedOptions ?? {})}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.cartItemKey === cartItemKey);
      if (existing) {
        return prev.map((i) =>
          i.cartItemKey === cartItemKey
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { ...item, cartItemKey, quantity }];
    });
  };

  const removeItem = (cartItemKey: string) =>
    setItems((prev) => prev.filter((i) => i.cartItemKey !== cartItemKey));

  const updateQuantity = (cartItemKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemKey);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.cartItemKey === cartItemKey ? { ...i, quantity } : i)),
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
