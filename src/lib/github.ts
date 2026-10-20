import { Feature } from "@/lib/features";

const OWNER = "pocketnest";
const WEB_REPO = "pocketnest-web";
const NATIVE_REPO = "pocketnest-react-native";
const READY_LABEL = "ready-for-testing";
const FEATURE_PREFIX = "feature:";

type GitHubLabel = { name: string } | string;

type GitHubPull = {
  title: string;
  body: string | null;
  html_url: string;
  updated_at: string;
  user: { login: string } | null;
  head: { ref: string };
  labels: GitHubLabel[];
};

type Deployment = { id: number };

type DeploymentStatus = {
  state: string;
  environment_url?: string | null;
};

type PullSide = {
  branch: string;
  url: string;
  title: string;
  description: string;
  author: string;
  updatedAt: string;
  previewUrl?: string;
};

export class GitHubReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubReadError";
  }
}

function labelNames(labels: GitHubLabel[]) {
  return labels.map((label) => (typeof label === "string" ? label : label.name));
}

function featureSlug(labels: string[]) {
  const match = labels.find((label) =>
    label.toLowerCase().startsWith(FEATURE_PREFIX),
  );
  return match?.slice(FEATURE_PREFIX.length).trim() || null;
}

function summary(body: string | null, title: string) {
  const text = (body ?? "").replace(/\r/g, "").trim();
  if (!text) return title;
  const paragraph = text.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  return paragraph.length > 280 ? `${paragraph.slice(0, 277)}...` : paragraph;
}

function titleFromSlug(slug: string) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pncodedash",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GitHubReadError(
      `GitHub returned ${response.status} while reading ${path}.`,
    );
  }

  return response.json() as Promise<T>;
}

async function listReadyPulls(repo: string, token: string) {
  const pulls: GitHubPull[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const batch = await githubFetch<GitHubPull[]>(
      `/repos/${OWNER}/${repo}/pulls?state=open&per_page=100&page=${page}`,
      token,
    );
    pulls.push(...batch);
    if (batch.length < 100) break;
  }

  return pulls.filter((pull) =>
    labelNames(pull.labels).some(
      (label) => label.toLowerCase() === READY_LABEL,
    ),
  );
}

async function findPreviewUrl(repo: string, branch: string, token: string) {
  const deployments = await githubFetch<Deployment[]>(
    `/repos/${OWNER}/${repo}/deployments?ref=${encodeURIComponent(branch)}&per_page=5`,
    token,
  );

  for (const deployment of deployments) {
    const statuses = await githubFetch<DeploymentStatus[]>(
      `/repos/${OWNER}/${repo}/deployments/${deployment.id}/statuses?per_page=10`,
      token,
    );
    const live = statuses.find(
      (status) => status.state === "success" && status.environment_url,
    );
    if (live?.environment_url) return live.environment_url;
  }

  return undefined;
}

async function toSide(repo: string, pull: GitHubPull, token: string) {
  const slug = featureSlug(labelNames(pull.labels));
  if (!slug) return null;

  let previewUrl: string | undefined;
  try {
    previewUrl = await findPreviewUrl(repo, pull.head.ref, token);
  } catch {
    previewUrl = undefined;
  }

  return {
    slug,
    side: {
      branch: pull.head.ref,
      url: pull.html_url,
      title: pull.title,
      description: summary(pull.body, pull.title),
      author: pull.user?.login ?? "Unknown",
      updatedAt: pull.updated_at.slice(0, 10),
      previewUrl,
    } satisfies PullSide,
  };
}

function owners(web?: PullSide, native?: PullSide) {
  if (web && native && web.author !== native.author) {
    return `${web.author} / ${native.author}`;
  }
  return web?.author ?? native?.author ?? "Unknown";
}

export async function loadTestingFeatures(token: string): Promise<Feature[]> {
  const [webPulls, nativePulls] = await Promise.all([
    listReadyPulls(WEB_REPO, token),
    listReadyPulls(NATIVE_REPO, token),
  ]);

  const [webSides, nativeSides] = await Promise.all([
    Promise.all(webPulls.map((pull) => toSide(WEB_REPO, pull, token))),
    Promise.all(nativePulls.map((pull) => toSide(NATIVE_REPO, pull, token))),
  ]);

  const groups = new Map<string, { web?: PullSide; native?: PullSide }>();

  for (const entry of webSides) {
    if (!entry) continue;
    groups.set(entry.slug, { ...groups.get(entry.slug), web: entry.side });
  }

  for (const entry of nativeSides) {
    if (!entry) continue;
    groups.set(entry.slug, { ...groups.get(entry.slug), native: entry.side });
  }

  return [...groups.entries()]
    .flatMap(([slug, group]) => {
      const primary = group.web ?? group.native;
      if (!primary) return [];
      const previewUrl = group.web?.previewUrl ?? group.native?.previewUrl;
      const updatedAt = [group.web?.updatedAt, group.native?.updatedAt]
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1);

      const feature: Feature = {
        id: slug,
        title: titleFromSlug(slug),
        description: primary.description,
        owner: owners(group.web, group.native),
        team:
          group.web && group.native
            ? "Web + React Native"
            : group.web
              ? "Web"
              : "React Native",
        status: "Ready for testing",
        targetDate: primary.updatedAt,
        webBranch: group.web?.branch ?? "",
        nativeBranch: group.native?.branch ?? "",
        webUrl: group.web?.url,
        nativeUrl: group.native?.url,
        previewUrl,
        webPreviewUrl: group.web?.previewUrl,
        nativePreviewUrl: group.native?.previewUrl,
        progress: 0,
        updatedAt: updatedAt ?? primary.updatedAt,
      };

      return [feature];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
