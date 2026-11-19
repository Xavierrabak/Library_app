import Link from "next/link";

export default function CreateAccount() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Create account</h1>
        <p className="mb-6 text-slate-600">Set up your library account.</p>

        <form className="space-y-4">
          <input
            aria-label="Username"
            name="username"
            type="text"
            placeholder="Username"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200"
          />
          <input
            aria-label="Email address"
            name="email"
            type="email"
            placeholder="Email address"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200"
          />
          <input
            aria-label="Password"
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-yellow-600 px-8 py-3 font-semibold text-white hover:bg-yellow-700"
          >
            Create account
          </button>
        </form>

        <Link href="/" className="mt-6 block text-center text-sm text-blue-700 hover:underline">
          Back to login
        </Link>
      </section>
    </main>
  );
}
