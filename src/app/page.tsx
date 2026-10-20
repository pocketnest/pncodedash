import { Suspense } from "react";
import { connection } from "next/server";
import Dashboard from "@/components/dashboard";
import { Feature, seedFeatures } from "@/lib/features";
import { GitHubReadError, loadTestingFeatures } from "@/lib/github";

function BoardFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7f9] text-sm font-medium text-slate-500">
      Loading the testing board...
    </div>
  );
}

async function TestingBoard() {
  await connection();
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return <Dashboard initialFeatures={seedFeatures} source="sample" />;
  }

  let features: Feature[] = [];
  let errorMessage: string | undefined;

  try {
    features = await loadTestingFeatures(token);
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
