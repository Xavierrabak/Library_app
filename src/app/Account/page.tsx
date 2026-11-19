export default function Account() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-slate-800">My Account</h1>
          <p className="mt-2 text-slate-600">
            View the books currently checked out or waiting on hold.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Checked Out
            </h2>
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No books are currently checked out.
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold text-slate-800">On Hold</h2>
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No books are currently on hold.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
