"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Profile {
  loginId: string;
  name: string;
  accountType: string;
}

// Pages shown before anyone is signed in don't get a profile menu.
const LOGGED_OUT_PATHS = ["/", "/CreateAccount", "/ForgotPassword"];

export function ProfileDropdown({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (LOGGED_OUT_PATHS.includes(pathname)) return null;

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/session", { method: "DELETE" });
    setOpen(false);
    setLoggingOut(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="fixed right-4 top-4 z-50">
      <button
        type="button"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
        >
          {profile ? (
            <>
              <p className="truncate font-semibold text-slate-800">{profile.name}</p>
              <p className="truncate text-sm text-slate-500">{profile.loginId}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {profile.accountType}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => void logout()}
                disabled={loggingOut}
                className="mt-4 w-full rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">You are not signed in.</p>
              <Link
                href="/"
                role="menuitem"
                className="mt-3 block w-full rounded-full bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Go to login
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
