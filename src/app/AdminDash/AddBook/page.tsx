import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listShelves } from "@/lib/inventory";
import { AddBookForm } from "./AddBookForm";

async function AddBookContent() {
  await connection();
  return <AddBookForm shelves={await listShelves()} />;
}

export default function AddBook() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
          Librarian Tools
        </p>
        <h1 className="text-3xl font-bold text-slate-800">Add a Book</h1>
        <p className="mt-2 text-slate-600">
          Add a new book, or another copy of an existing one, to a shelf (50 books maximum).
        </p>
        <Suspense fallback={<p className="mt-8 text-slate-500">Loading shelves…</p>}>
          <AddBookContent />
        </Suspense>
        <Link href="/AdminDash" className="mt-8 inline-block text-sm text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
