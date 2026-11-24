"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-sans font-medium text-slate-900 opacity-100 outline-none transition focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginID: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!data.ok) {
        setError(data.error ?? "Could not sign in.");
        return;
      }
      router.push(data.accountType === "librarian" ? "/AdminDash" : "/UserDash");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-yellow-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-800 hover:shadow-xl disabled:opacity-60"
      >
        Login
      </button>
      <div className="flex justify-center px-2 pt-2 text-sm">
        <Link
          href="/ForgotPassword"
          className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
