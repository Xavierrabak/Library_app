"use client";

import { FormEvent, useState } from "react";

const books = [
  { title: "The Midnight Library", shelf: "Fiction - FIC-01" },
  { title: "Atomic Habits", shelf: "Self-help - SEL-02" },
  { title: "Project Hail Mary", shelf: "Science Fiction - SCI-01" },
];

const shelves = [
  "Fiction - FIC-01",
  "Fiction - FIC-02",
  "Self-help - SEL-01",
  "Self-help - SEL-02",
  "Science Fiction - SCI-01",
];

export default function MoveBook() {
  const [bookTitle, setBookTitle] = useState(books[0].title);
  const selectedBook = books.find((book) => book.title === bookTitle) ?? books[0];
  const [destinationShelf, setDestinationShelf] = useState(shelves[0]);
  const [position, setPosition] = useState("1");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      `${selectedBook.title} is ready to move to ${destinationShelf}, position ${position}.`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
          Librarian Tools
        </p>
        <h1 className="text-3xl font-bold text-slate-800">Move a Book</h1>
        <p className="mt-2 text-slate-600">
          Reorder a book on the shelves by selecting its new shelf and position.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="book"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Book
            </label>
            <select
              id="book"
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            >
              {books.map((book) => (
                <option key={book.title} value={book.title}>
                  {book.title}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-500">
              Current shelf: {selectedBook.shelf}
            </p>
          </div>

          <div>
            <label
              htmlFor="destination-shelf"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Destination shelf
            </label>
            <select
              id="destination-shelf"
              value={destinationShelf}
              onChange={(event) => setDestinationShelf(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            >
              {shelves.map((shelf) => (
                <option key={shelf} value={shelf}>
                  {shelf}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="position"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Shelf position
            </label>
            <input
              id="position"
              type="number"
              min="1"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Preview shelf change
          </button>
        </form>

        {message && (
          <p className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
