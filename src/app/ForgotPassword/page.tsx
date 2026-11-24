import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Forgot password?</h1>
        <p className="mb-6 text-slate-600">
          Enter your login ID and full name to set a new password.
        </p>

        <ForgotPasswordForm />
      </section>
    </main>
  );
}
