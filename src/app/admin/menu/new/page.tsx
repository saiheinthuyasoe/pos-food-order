"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Category } from "@/types";
import MenuItemForm from "@/components/admin/MenuItemForm";

export default function NewMenuItemPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, "categories"), orderBy("displayOrder"))).then(
      (snap) =>
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category),
        ),
    );
  }, []);

  return <MenuItemForm categories={categories} />;
}
