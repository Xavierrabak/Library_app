import Link from "next/link";

const books = [
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    category: "Fiction",
    description: "A novel about the possibilities found between life and death.",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-help",
    description: "A practical guide to building good habits and breaking bad ones.",
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    category: "Science Fiction",
    description: "A science-fiction adventure about one astronaut's mission to save humanity.",
  },
];

type BookPageProps = {
  params: Promise<{ title: string }>;
};

export default async function BookPage({ params }: BookPageProps) {
  const { title } = await params;
  const book = books.find(
    (item) => item.title === decodeURIComponent(title),
  );

  if (!book) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-800">Book not found</h1>
          <Link href="/Search" className="mt-4 inline-block text-blue-700 hover:underline">
            Back to book search
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <Link href="/Search" className="text-sm font-medium text-blue-700 hover:underline">
          ← Back to book search
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-blue-600">
          {book.category}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-800">{book.title}</h1>
        <p className="mt-2 text-slate-600">by {book.author}</p>
        <p className="mt-6 text-slate-700">{book.description}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Borrow book
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-blue-600 px-6 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Place on hold
          </button>
        </div>
      </section>
    </main>
  );
}
