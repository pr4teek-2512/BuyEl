import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/adminSession";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata = { title: "Admin sign in - BuyEl" };

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-soft px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-sm">
        <p className="text-lg font-semibold tracking-tight">
          Buy<span className="text-brand">El</span>
        </p>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">Staff access only.</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
