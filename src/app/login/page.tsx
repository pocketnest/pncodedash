import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import GoogleSignInButton from "@/components/google-sign-in-button";
import { authOptions, isPocketnestEmail } from "@/lib/auth";

function LoginFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7f9] text-sm text-slate-500">
      Loading sign-in...
    </div>
  );
}

async function LoginScreen({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  await connection();
  const session = await getServerSession(authOptions);
  if (isPocketnestEmail(session?.user?.email)) redirect("/");

  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const message =
    error === "AccessDenied"
      ? "Only verified @pocketnest.com Google accounts can sign in."
      : error === "Configuration"
        ? "Google sign-in is not configured yet."
        : error
          ? "Sign-in did not complete. Try again with your Pocketnest account."
          : "";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,.06)]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff6b4a] text-white">
            <Boxes size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-950">
              PNCodeDash
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-400">
              Pocketnest testing board
            </div>
          </div>
        </div>
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use your Pocketnest Google account. Other email addresses are not
          accepted.
        </p>
        {message && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {message}
          </p>
        )}
        <div className="mt-6">
          <GoogleSignInButton />
        </div>
      </section>
    </main>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginScreen searchParams={searchParams} />
    </Suspense>
  );
}
