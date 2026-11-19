import Link from "next/link";

const adminOptions = [
  { label: "Book Search", href: "/Search" },
  { label: "Account", href: "/Account" },
  { label: "Settings", href: "/Settings" },
  { label: "Add a Book", href: "/AdminDash/AddBook" },
  { label: "Remove a Book", href: "/AdminDash/RemoveBook" },
  { label: "Move a Book", href: "/AdminDash/MoveBook" },
];

export default function AdminDashboard() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">
          Admin Dashboard
        </h1>
        <p className="mb-8 text-slate-600">
          Manage the books in the library collection.
        </p>

        <nav aria-label="Admin menu" className="grid gap-4">
          {adminOptions.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="rounded-full bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
