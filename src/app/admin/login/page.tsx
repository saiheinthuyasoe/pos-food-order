"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAdmin(email, password);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white text-3xl mb-4">
            🍽️
          </div>
          <h1 className="text-2xl font-bold text-white">Staff Login</h1>
          <p className="text-gray-400 text-sm mt-1">Admin access only</p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@restaurant.com"
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            Customer?{" "}
            <a href="/" className="text-amber-400 hover:underline">
              Go to main site →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("Access denied")) return msg;
    if (
      msg.includes("user-not-found") ||
      msg.includes("wrong-password") ||
      msg.includes("invalid-credential")
    )
      return "Invalid email or password.";
    if (msg.includes("too-many-requests"))
      return "Too many failed attempts. Please try again later.";
    return msg;
  }
  return "Something went wrong. Please try again.";
}
