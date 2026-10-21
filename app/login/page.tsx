import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Health Reference" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[var(--color-background)]">
      <h1 className="text-5xl font-bold text-[#FE6959] mb-10 tracking-tight">Health Reference</h1>
      <LoginForm next={next} />
    </div>
  );
}
