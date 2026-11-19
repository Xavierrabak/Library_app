export default function Settings() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-800">Account Settings</h1>
        <p className="mt-2 text-slate-600">
          Manage your account preferences.
        </p>

        <form className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="display-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <label className="flex items-center gap-3 text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" />
            Email me when a held book is ready
          </label>

          <button
            type="submit"
            className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Save settings
          </button>
        </form>
      </section>
    </main>
  );
}
