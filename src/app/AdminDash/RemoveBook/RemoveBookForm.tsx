"use client";

import { useState } from "react";
import { buttonClass, callApi } from "../_components/api";
import { CopyPicker, type PickedCopy } from "../_components/CopyPicker";

export function RemoveBookForm() {
  const [selected, setSelected] = useState<PickedCopy | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    if (!selected) return;
    setBusy(true);
    const data = await callApi("/api/librarian/copies", "DELETE", {
      bookId: selected.bookId,
      copyNumber: selected.copyNumber,
    });
    setBusy(false);
    if (!data.ok) {
      setMessage({ ok: false, text: data.error ?? "Could not remove the copy." });
      return;
    }
    setMessage({
      ok: true,
      text: `Removed copy #${selected.copyNumber} of "${selected.title}".`,
    });
    setSelected(null);
  }

  return (
    <div className="mt-8 space-y-6">
      <CopyPicker selected={selected} onSelect={setSelected} />
      {selected && (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          Selected: <strong>{selected.title}</strong>, copy #{selected.copyNumber} on shelf{" "}
          {selected.shelfId}.
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleRemove()}
        disabled={!selected || busy}
        className={`w-full ${buttonClass}`}
      >
        Remove selected copy
      </button>
      {message && (
        <p className={`rounded-lg p-4 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
