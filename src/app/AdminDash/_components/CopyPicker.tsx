"use client";

import { useState } from "react";
import { buttonClass, callApi, inputClass } from "./api";

export interface PickedCopy {
  bookId: number;
  copyNumber: number;
  title: string;
  isbn: string | null;
  shelfId: number;
  status: string | null;
}

export function CopyPicker({
  selected,
  onSelect,
}: {
  selected: PickedCopy | null;
  onSelect: (copy: PickedCopy) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedCopy[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    setError("");
    const data = await callApi(`/api/librarian/copies?q=${encodeURIComponent(query)}`, "GET");
    setLoading(false);
    if (!data.ok) {
      setError(data.error ?? "Search failed.");
      setResults(null);
      return;
    }
    setResults(data.copies as PickedCopy[]);
  }

  return (
    <div>
      <label htmlFor="copy-search" className="mb-2 block text-sm font-medium text-slate-700">
        Find a book copy (title or ISBN)
      </label>
      <div className="flex gap-2">
        <input
          id="copy-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          className={inputClass}
        />
        <button type="button" onClick={() => void search()} disabled={loading} className={buttonClass}>
          Search
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {results && results.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">No copies found.</p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-3 max-h-64 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200">
          {results.map((copy) => {
            const isSelected =
              selected?.bookId === copy.bookId && selected.copyNumber === copy.copyNumber;
            return (
              <li key={`${copy.bookId}-${copy.copyNumber}`}>
                <button
                  type="button"
                  onClick={() => onSelect(copy)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 ${
                    isSelected ? "bg-blue-100" : ""
                  }`}
                >
                  <span className="font-medium text-slate-800">{copy.title}</span>
                  <span className="block text-slate-500">
                    Copy #{copy.copyNumber} · Shelf {copy.shelfId} · {copy.status ?? "unknown"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
