import Link from "next/link";
import { NextDayPanel } from "./NextDayPanel";

const tools = [
  { href: "/AdminDash/AddBook", title: "Add a book", text: "Add a new book or an extra copy." },
  { href: "/AdminDash/RemoveBook", title: "Remove a book", text: "Remove an eligible copy." },
  { href: "/AdminDash/MoveBook", title: "Move a book", text: "Move a copy to another shelf." },
];

export default function AdminDash() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
          Librarian Tools
        </p>
        <h1 className="text-3xl font-bold text-slate-800">Librarian Dashboard</h1>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="block h-full rounded-xl border border-slate-200 p-4 hover:border-blue-600 hover:bg-blue-50"
              >
                <span className="font-semibold text-slate-800">{tool.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{tool.text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <NextDayPanel />
      </section>
    </main>
  );
}
