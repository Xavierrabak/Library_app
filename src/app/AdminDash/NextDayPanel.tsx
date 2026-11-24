"use client";

import { useState } from "react";
import { buttonClass, callApi, inputClass } from "./_components/api";

interface NextDaySummary {
  processingDate: string;
  alreadyProcessed: boolean;
  overdueLoans: { bookId: number; copyNumber: number; onLoanTo: string; daysOverdue: number; fine: number }[];
  expiredHolds: { bookId: number; copyNumber: number; onHoldTo: string }[];
}

export function NextDayPanel() {
  const [date, setDate] = useState("");
  const [result, setResult] = useState<NextDaySummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    const data = await callApi("/api/librarian/next-day", "POST", { date });
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? "Next-day processing failed. Nothing was changed; you can retry.");
      return;
    }
    setResult(data as unknown as NextDaySummary);
  }

  return (
    <div className="mt-10 rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-800">Next-day update</h2>
      <p className="mt-1 text-sm text-slate-600">
        Applies overdue fines and expires old holds for the chosen date. Each date can only be
        processed once.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="processing-date" className="mb-2 block text-sm font-medium text-slate-700">
            Processing date (blank = today)
          </label>
          <input
            id="processing-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </div>
        <button type="button" onClick={() => void run()} disabled={busy} className={buttonClass}>
          Run next-day update
        </button>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {result && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">
            {result.alreadyProcessed
              ? `${result.processingDate} was already processed; no changes made.`
              : `Processed ${result.processingDate}.`}
          </p>
          <p className="mt-1">
            {result.overdueLoans.length} overdue loan(s), {result.expiredHolds.length} expired
            hold(s).
          </p>
        </div>
      )}
    </div>
  );
}
