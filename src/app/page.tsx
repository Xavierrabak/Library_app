import { LoginForm } from "./LoginForm";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Login</h1>
        <p className="mb-6 text-slate-600">
          Sign in to access your library account.
        </p>

        <LoginForm />
      </section>
    </main>
  );
}
