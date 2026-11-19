import Link from "next/link";

export default function ForgotPassword() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Forgot password?</h1>
        <p className="mb-6 text-slate-600">
          Enter your email and we will send password reset instructions.
        </p>

        <form className="space-y-4">
          <input
            aria-label="Email address"
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-yellow-600 px-8 py-3 font-semibold text-white hover:bg-yellow-700"
          >
            Send reset link
          </button>
        </form>

        <Link href="/" className="mt-6 block text-center text-sm text-blue-700 hover:underline">
          Back to login
        </Link>
      </section>
    </main>
  );
}
