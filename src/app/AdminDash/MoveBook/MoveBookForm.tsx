"use client";

import { useState } from "react";
import { buttonClass, callApi, inputClass, shelfLabel, type ShelfOption } from "../_components/api";
import { CopyPicker, type PickedCopy } from "../_components/CopyPicker";

export function MoveBookForm({ shelves }: { shelves: ShelfOption[] }) {
  const [selected, setSelected] = useState<PickedCopy | null>(null);
  const [destination, setDestination] = useState(shelves[0] ? String(shelves[0].id) : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleMove() {
    if (!selected) return;
    setBusy(true);
    const data = await callApi("/api/librarian/copies/move", "POST", {
      bookId: selected.bookId,
      copyNumber: selected.copyNumber,
      destinationShelfId: destination,
    });
    setBusy(false);
    if (!data.ok) {
      setMessage({ ok: false, text: data.error ?? "Could not move the copy." });
      return;
    }
    const to = data.toShelf as ShelfOption;
    setMessage({
      ok: true,
      text: data.moved
        ? `Moved to shelf ${to.id} (${to.count}/${to.capacity}).`
        : `Already on shelf ${to.id}; nothing changed.`,
    });
    setSelected(data.moved ? { ...selected, shelfId: to.id } : selected);
  }

  return (
    <div className="mt-8 space-y-6">
      <CopyPicker selected={selected} onSelect={setSelected} />
      {selected && (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          Selected: <strong>{selected.title}</strong>, copy #{selected.copyNumber}, currently on
          shelf {selected.shelfId}.
        </p>
      )}
      <div>
        <label htmlFor="destination-shelf" className="mb-2 block text-sm font-medium text-slate-700">
          Destination shelf
        </label>
        <select
          id="destination-shelf"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          className={inputClass}
        >
          {shelves.length === 0 && <option value="">No shelves exist yet</option>}
          {shelves.map((shelf) => (
            <option key={shelf.id} value={shelf.id}>
              {shelfLabel(shelf)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => void handleMove()}
        disabled={!selected || !destination || busy}
        className={`w-full ${buttonClass}`}
      >
        Move book
      </button>
      {message && (
        <p className={`rounded-lg p-4 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
