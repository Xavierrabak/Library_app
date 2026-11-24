import Link from "next/link";
import { RemoveBookForm } from "./RemoveBookForm";

export default function RemoveBook() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
          Librarian Tools
        </p>
        <h1 className="text-3xl font-bold text-slate-800">Remove a Book</h1>
        <p className="mt-2 text-slate-600">
          Remove a copy from the collection. Copies that are on loan or have a waiting hold cannot
          be removed.
        </p>
        <RemoveBookForm />
        <Link href="/AdminDash" className="mt-8 inline-block text-sm text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
