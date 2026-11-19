export default function AdminTest() {
  return <PlaceholderPage title="AdminDash" />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
    </main>
  );
}
