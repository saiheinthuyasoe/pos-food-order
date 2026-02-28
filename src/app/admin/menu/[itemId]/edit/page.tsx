"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MenuItem, Category } from "@/types";
import MenuItemForm from "@/components/admin/MenuItemForm";

export default function EditMenuItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, "menu_items", itemId)),
      getDocs(query(collection(db, "categories"), orderBy("displayOrder"))),
    ]).then(([itemSnap, catsSnap]) => {
      if (itemSnap.exists()) {
        setItem({ id: itemSnap.id, ...itemSnap.data() } as MenuItem);
      }
      setCategories(
        catsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category),
      );
      setLoading(false);
    });
  }, [itemId]);

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!item) return <div className="p-6 text-gray-500">Item not found.</div>;

  return (
    <MenuItemForm categories={categories} initial={item} itemId={itemId} />
  );
}
