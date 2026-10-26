import SetPasswordForm from "./SetPasswordForm";

export const metadata = { title: "Set password · Health Reference" };

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[var(--color-background)]">
      <div className="w-full max-w-sm mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#FE6959] mb-3 tracking-tight">Choose a new password</h1>
        <p className="text-[var(--color-muted)] text-base">You signed in with a temporary password. Pick your own to continue.</p>
      </div>
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
        <SetPasswordForm />
      </div>
    </div>
  );
}
