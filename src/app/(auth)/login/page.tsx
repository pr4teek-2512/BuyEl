import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginFlow } from "./LoginFlow";

export const metadata = { title: "Sign in - BuyEl" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/buy");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight text-ink">
        Buy<span className="text-brand">El</span>
      </Link>
      <LoginFlow />
    </main>
  );
}
