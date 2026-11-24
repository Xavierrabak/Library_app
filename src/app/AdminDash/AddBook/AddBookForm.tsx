"use client";

import { FormEvent, useState } from "react";
import { buttonClass, callApi, inputClass, shelfLabel, type ShelfOption } from "../_components/api";

export function AddBookForm({ shelves }: { shelves: ShelfOption[] }) {
  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [series, setSeries] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [authors, setAuthors] = useState("");
  const [shelfId, setShelfId] = useState(shelves[0] ? String(shelves[0].id) : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = await callApi("/api/librarian/books", "POST", {
      isbn,
      title,
      genre,
      series,
      releaseYear,
      authors,
      shelfId,
    });
    setBusy(false);
    if (!data.ok) {
      setMessage({ ok: false, text: data.error ?? "Could not add the book." });
      return;
    }
    const shelf = data.shelf as ShelfOption;
    setMessage({
      ok: true,
      text: `${data.createdBook ? "Book added" : "Extra copy added"} as copy #${data.copyNumber} on shelf ${shelf.id} (${shelf.count}/${shelf.capacity}).`,
    });
    setIsbn("");
    setTitle("");
    setGenre("");
    setSeries("");
    setReleaseYear("");
    setAuthors("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <Field id="isbn" label="ISBN (13 digits)">
        <input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} className={inputClass} required />
      </Field>
      <p className="-mt-3 text-sm text-slate-500">
        If this ISBN already exists, only a new copy is added and the details below are ignored.
      </p>
      <Field id="title" label="Title">
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </Field>
      <Field id="authors" label="Author(s), separated by semicolons">
        <input id="authors" value={authors} onChange={(e) => setAuthors(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="year" label="Release year">
          <input
            id="year"
            type="number"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="genre" label="Genre (optional)">
          <input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field id="series" label="Series (optional)">
        <input id="series" value={series} onChange={(e) => setSeries(e.target.value)} className={inputClass} />
      </Field>
      <Field id="shelf" label="Shelf">
        <select id="shelf" value={shelfId} onChange={(e) => setShelfId(e.target.value)} className={inputClass} required>
          {shelves.length === 0 && <option value="">No shelves exist yet</option>}
          {shelves.map((shelf) => (
            <option key={shelf.id} value={shelf.id}>
              {shelfLabel(shelf)}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" disabled={busy || shelves.length === 0} className={`w-full ${buttonClass}`}>
        Add book
      </button>
      {message && (
        <p className={`rounded-lg p-4 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
