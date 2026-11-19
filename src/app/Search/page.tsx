"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

const books = [
  { title: "The Midnight Library", author: "Matt Haig", category: "Fiction" },
  { title: "Atomic Habits", author: "James Clear", category: "Self-help" },
  { title: "Project Hail Mary", author: "Andy Weir", category: "Science Fiction" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = ["All", ...new Set(books.map((book) => book.category))];
  const results = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return books.filter((book) => {
      const matchesQuery =
        book.title.toLowerCase().includes(normalizedQuery) ||
        book.author.toLowerCase().includes(normalizedQuery);
      const matchesCategory = category === "All" || book.category === category;

      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-blue-700 p-8 text-white shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Library Collection
          </p>
          <h1 className="mb-2 text-3xl font-bold">Book Search</h1>
          <p className="mb-6 text-blue-100">
            Search by book title, author, or category.
          </p>

          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <label htmlFor="book-search" className="sr-only">
              Search books
            </label>
            <input
              id="book-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter a title or author"
              className="rounded-lg bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-300"
            />

            <label htmlFor="category" className="sr-only">
              Filter by Genre
            </label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-yellow-300"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-yellow-400 px-6 py-3 font-bold text-yellow-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200"
            >
              Search
            </button>
          </form>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Sample Results ({results.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {results.map((book) => (
              <Link
                key={book.title}
                href={`/Search/${encodeURIComponent(book.title)}`}
                className="rounded-xl bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <p className="mb-2 text-sm font-semibold text-blue-600">
                  {book.category}
                </p>
                <h3 className="font-bold text-slate-800">{book.title}</h3>
                <p className="mt-2 text-slate-600">by {book.author}</p>
                <p className="mt-4 text-sm font-semibold text-blue-700">
                  View borrowing options
                </p>
              </Link>
            ))}
          </div>
          {results.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-slate-600 shadow-md">
              No books found. Try a different search.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
