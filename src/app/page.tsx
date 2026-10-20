import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { authOptions, isPocketnestEmail } from "@/lib/auth";
import { Feature, seedFeatures } from "@/lib/features";
import { GitHubReadError, loadTestingFeatures } from "@/lib/github";
import { loadPreviewUrls } from "@/lib/preview-urls";

function BoardFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7f9] text-sm font-medium text-slate-500">
      Loading the testing board...
    </div>
  );
}

async function TestingBoard() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!isPocketnestEmail(session?.user?.email)) redirect("/login");

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return (
      <Dashboard
        initialFeatures={seedFeatures}
        source="sample"
        userEmail={session.user.email}
      />
    );
  }

  let features: Feature[] = [];
  let errorMessage: string | undefined;

  try {
    const [loadedFeatures, previewUrls] = await Promise.all([
      loadTestingFeatures(token),
      loadPreviewUrls(token),
    ]);
    features = loadedFeatures.map((feature) => ({
      ...feature,
      previewUrl: previewUrls[feature.id],
    }));
  } catch (error) {
    features = [];
    errorMessage =
      error instanceof GitHubReadError
        ? error.message
        : "GitHub could not be reached. Check that GITHUB_TOKEN can read both Pocketnest repositories.";
  }

  return (
    <Dashboard
      initialFeatures={features}
      source="github"
      error={errorMessage}
      userEmail={session.user.email}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<BoardFallback />}>
      <TestingBoard />
    </Suspense>
  );
}
