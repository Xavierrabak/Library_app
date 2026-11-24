"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200";
const buttonClass =
  "w-full rounded-full bg-yellow-600 px-8 py-3 font-semibold text-white hover:bg-yellow-700 disabled:opacity-60";

type Step = "identify" | "reset" | "done";

async function post(body: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("identify");
  const [loginID, setLoginID] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await post({ loginID, name });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "We couldn't verify those details.");
      return;
    }
    setStep("reset");
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await post({ loginID, name, newPassword });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not update the password.");
      return;
    }
    setNewPassword("");
    setConfirm("");
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          Your password has been updated. You can now log in with it.
        </p>
        <Link href="/" className={`block text-center ${buttonClass}`}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      {step === "identify" ? (
        <form onSubmit={handleIdentify} className="space-y-4">
          <input
            aria-label="Login ID"
            placeholder="Login ID"
            autoComplete="username"
            value={loginID}
            onChange={(event) => setLoginID(event.target.value)}
            required
            className={inputClass}
          />
          <input
            aria-label="Full name"
            placeholder="Full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={inputClass}
          />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={busy} className={buttonClass}>
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <p className="text-sm text-slate-600">
            Account found for <strong>{loginID}</strong>. Choose a new password (at least 8
            characters).
          </p>
          <input
            aria-label="New password"
            placeholder="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            className={inputClass}
          />
          <input
            aria-label="Confirm new password"
            placeholder="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            className={inputClass}
          />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={busy} className={buttonClass}>
            Update password
          </button>
        </form>
      )}
      <Link href="/" className="mt-6 block text-center text-sm text-blue-700 hover:underline">
        Back to login
      </Link>
    </>
  );
}
