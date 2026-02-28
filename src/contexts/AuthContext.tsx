"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Cookie helpers (client-side only, 7-day expiry)
function setCookie(name: string, value: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export type AdminRole = "super_admin" | "kitchen" | "delivery" | null;

interface AuthContextValue {
  user: User | null;
  adminRole: AdminRole;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  adminRole: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        setCookie("isLoggedIn", "1");
        // Check if this user is an admin
        try {
          const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
          if (adminDoc.exists()) {
            const role = adminDoc.data().role as AdminRole;
            setAdminRole(role);
            setCookie("isAdmin", "1");
          } else {
            setAdminRole(null);
            deleteCookie("isAdmin");
          }
        } catch {
          setAdminRole(null);
          deleteCookie("isAdmin");
        }
      } else {
        setAdminRole(null);
        deleteCookie("isLoggedIn");
        deleteCookie("isAdmin");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setAdminRole(null);
    deleteCookie("isLoggedIn");
    deleteCookie("isAdmin");
  };

  return (
    <AuthContext.Provider
      value={{ user, adminRole, isAdmin: adminRole !== null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
