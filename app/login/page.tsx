import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Health Reference" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[var(--color-background)]">
      <div className="w-full max-w-sm mb-8 text-center">
        <h1 className="text-5xl font-bold text-[#FE6959] mb-3 tracking-tight">Health Reference</h1>
        <p className="text-[var(--color-muted)] text-base">Functional health practitioner library</p>
      </div>
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
