import { AppLogo } from "@/components/dashboard/app-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 px-4 py-12">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="relative w-full max-w-md">
        <AppLogo className="mb-8 justify-center" />
        {children}
      </div>
    </main>
  );
}
