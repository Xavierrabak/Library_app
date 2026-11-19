import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Login</h1>
        <p className="mb-6 text-slate-600">
          Sign in to access your library account.
        </p>

        <form className="space-y-4 text-left">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-sans font-medium text-slate-900 opacity-100 outline-none transition focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-sans font-medium text-slate-900 opacity-100 outline-none transition focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200"
            />
          </div>

          <Link
            href="/UserDash"
            className="w-full rounded-full bg-yellow-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-800 hover:shadow-xl"
          >
            Login
          </Link>
          <div className="flex justify-between px-2 pt-2 text-sm">
            <Link
              href="/CreateAccount"
              className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
            >
              Create account
            </Link>
            <Link
              href="/ForgotPassword"
              className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}