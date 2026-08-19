import { AppLogo } from "@/components/dashboard/app-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <AppLogo className="mb-8 justify-center" />
        {children}
      </div>
    </main>
  );
}
