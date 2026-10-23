import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { authOptions, isPocketnestEmail } from "@/lib/auth";
import { Feature, seedFeatures } from "@/lib/features";
import { ClickUpReadError, loadTicketsForFeatures } from "@/lib/clickup";
import {
  GitHubReadError,
  loadBackendTestingUrls,
  loadTestingFeatures,
} from "@/lib/github";
import { TestingUrlError, loadTestingUrls } from "@/lib/testing-url-store";

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
    const loaded = await loadTestingFeatures(token);
    features = loaded.features;
    errorMessage = loaded.notice;
  } catch (error) {
    features = [];
    errorMessage =
      error instanceof GitHubReadError
        ? error.message
        : "GitHub could not be reached. Check that GITHUB_TOKEN can read both Pocketnest repositories.";
  }

  if (features.length > 0) {
    let savedUrls: Record<string, string> = {};
    try {
      savedUrls = await loadTestingUrls();
    } catch (error) {
      const message =
        error instanceof TestingUrlError
          ? error.message
          : "Saved testing environment URLs could not be read.";
      errorMessage = errorMessage ? `${errorMessage} ${message}` : message;
    }

    const deployments = await loadBackendTestingUrls(
      token,
      features.map((feature) => feature.webBranch),
    );
    if (deployments.notice) {
      errorMessage = errorMessage
        ? `${errorMessage} ${deployments.notice}`
        : deployments.notice;
    }

    features = features.map((feature) => {
      const saved = savedUrls[feature.id];
      const deployed = deployments.urls[feature.webBranch];
      if (saved) return { ...feature, previewUrl: saved };
      if (!deployed) return feature;
      return {
        ...feature,
        previewUrl: deployed,
        previewUrlFromDeployment: true,
      };
    });
  }

  const clickUpToken = process.env.CLICKUP_API_TOKEN;
  const clickUpTeamId = process.env.CLICKUP_TEAM_ID;
  if (features.length > 0 && (clickUpToken || clickUpTeamId)) {
    if (!clickUpToken || !clickUpTeamId) {
      const message =
        "Set both CLICKUP_API_TOKEN and CLICKUP_TEAM_ID to show ClickUp tickets.";
      errorMessage = errorMessage ? `${errorMessage} ${message}` : message;
    } else {
      try {
        const tickets = await loadTicketsForFeatures(
          clickUpToken,
          clickUpTeamId,
          features.map((feature) => feature.id),
        );
        features = features.map((feature) => ({
          ...feature,
          tickets: tickets[feature.id] ?? [],
        }));
      } catch (error) {
        const message =
          error instanceof ClickUpReadError
            ? error.message
            : "ClickUp could not be reached.";
        errorMessage = errorMessage ? `${errorMessage} ${message}` : message;
      }
    }
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
