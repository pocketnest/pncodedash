import { Feature } from "@/lib/features";
import { isTestingUrl } from "@/lib/testing-urls";

const OWNER = "pocketnest";
const WEB_REPO = "pocketnest-web";
const NATIVE_REPO = "pocketnest-react-native";
const READY_LABEL = "ready-for-testing";
const FEATURE_PREFIX = "feature:";

type GitHubLabel = { name: string } | string;

type GitHubPull = {
  number: number;
  node_id: string;
  title: string;
  body: string | null;
  html_url: string;
  updated_at: string;
  user: { login: string } | null;
  head: { ref: string };
  labels: GitHubLabel[];
};

type ProjectLink = {
  id: string;
  title: string;
  number: number;
  status: string;
};

type PullSide = {
  branch: string;
  url: string;
  title: string;
  description: string;
  author: string;
  updatedAt: string;
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

export function hasReadyLabel(labels: string[]) {
  return labels.some((label) => label.toLowerCase() === READY_LABEL);
}

export function isReadyProjectStatus(status: string) {
  const value = status
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    value === "ready to test" ||
    value === "ready for testing" ||
    value === "ready for test"
  );
}

export function chooseProject(projects: ProjectLink[]) {
  return (
    projects.find((project) => isReadyProjectStatus(project.status)) ??
    projects[0]
  );
}

function slugFromTitle(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "project";
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
    if (
      path.includes("/deployments") &&
      (response.status === 403 || response.status === 404)
    ) {
      throw new GitHubReadError(
        "The GitHub token needs Deployments read permission on pocketnest-web to fill testing URLs from the latest backend deployment.",
      );
    }
    throw new GitHubReadError(
      `GitHub returned ${response.status} while reading ${path}.`,
    );
  }

  return response.json() as Promise<T>;
}

async function listOpenPulls(repo: string, token: string) {
  const pulls: GitHubPull[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const batch = await githubFetch<GitHubPull[]>(
      `/repos/${OWNER}/${repo}/pulls?state=open&per_page=100&page=${page}`,
      token,
    );
    pulls.push(...batch);
    if (batch.length < 100) break;
  }

  return pulls;
}

type ProjectItemNode = {
  project?: { id?: string; title?: string; number?: number };
  fieldValues?: {
    nodes?: { name?: string; field?: { name?: string } }[];
  };
};

type ProjectQuery = {
  data?: {
    nodes?: ({
      id?: string;
      projectItems?: { nodes?: ProjectItemNode[] };
    } | null)[];
  };
  errors?: { type?: string; message?: string }[];
};

function statusFromItem(item: ProjectItemNode) {
  for (const value of item.fieldValues?.nodes ?? []) {
    if (value.field?.name?.toLowerCase() === "status" && value.name) {
      return value.name;
    }
  }
  return "";
}

async function loadProjects(pulls: GitHubPull[], token: string) {
  const projects = new Map<string, ProjectLink[]>();
  const ids = [...new Set(pulls.map((pull) => pull.node_id).filter(Boolean))];

  for (let index = 0; index < ids.length; index += 50) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "pncodedash",
      },
      body: JSON.stringify({
        query: `query($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on PullRequest {
              id
              projectItems(first: 10) {
                nodes {
                  project { id title number }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field { ... on ProjectV2SingleSelectField { name } }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        variables: { ids: ids.slice(index, index + 50) },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new GitHubReadError(
        `GitHub returned ${response.status} while reading projects.`,
      );
    }

    const body = (await response.json()) as ProjectQuery;
    if (body.errors?.length) {
      const missingScope = body.errors.some(
        (error) => error.type === "INSUFFICIENT_SCOPES",
      );
      throw new GitHubReadError(
        missingScope
          ? "The GitHub token needs permission to read Projects so branches can be grouped by project."
          : "GitHub projects could not be read.",
      );
    }

    for (const node of body.data?.nodes ?? []) {
      if (!node?.id) continue;
      const links = (node.projectItems?.nodes ?? []).flatMap((item) => {
        const id = item.project?.id;
        const title = item.project?.title?.trim();
        const number = item.project?.number;
        if (!id || !title || !number) return [];
        return [{ id, title, number, status: statusFromItem(item) }];
      });
      projects.set(node.id, links);
    }
  }

  return projects;
}

type Group = {
  id: string;
  title: string;
  webSlug?: string;
  nativeSlug?: string;
  projectName?: string;
  projectStatus?: string;
  projectUrl?: string;
  web?: PullSide;
  native?: PullSide;
};

function toPullSide(pull: GitHubPull): PullSide {
  return {
    branch: pull.head.ref,
    url: pull.html_url,
    title: pull.title,
    description: summary(pull.body, pull.title),
    author: pull.user?.login ?? "Unknown",
    updatedAt: pull.updated_at.slice(0, 10),
  };
}

function groupFor(pull: GitHubPull, project?: ProjectLink) {
  const slug = featureSlug(labelNames(pull.labels));
  if (project) {
    return {
      key: `project:${project.id}`,
      id: slug ?? slugFromTitle(project.title),
      title: project.title,
      featureSlug: slug ?? undefined,
      projectName: project.title,
      projectStatus: project.status,
      projectUrl: `https://github.com/orgs/${OWNER}/projects/${project.number}`,
    };
  }
  if (slug) {
    return {
      key: `feature:${slug}`,
      id: slug,
      title: titleFromSlug(slug),
      featureSlug: slug,
    };
  }
  return {
    key: `pull:${pull.node_id}`,
    id: `pull-${pull.number}`,
    title: pull.title,
  };
}

function preferNewer(current: PullSide | undefined, next: PullSide) {
  if (!current || current.updatedAt < next.updatedAt) return next;
  return current;
}

function owners(web?: PullSide, native?: PullSide) {
  if (web && native && web.author !== native.author) {
    return `${web.author} / ${native.author}`;
  }
  return web?.author ?? native?.author ?? "Unknown";
}

function featureId(group: Group) {
  const slugs = [group.webSlug, group.nativeSlug].filter(
    (slug): slug is string => Boolean(slug),
  );
  const unique = [...new Set(slugs)];
  const bothSides = Boolean(group.web && group.native);
  const shared =
    unique.length === 1 &&
    (!bothSides || Boolean(group.webSlug && group.nativeSlug));
  if (shared) return unique[0];
  if (group.projectName) return slugFromTitle(group.projectName);
  return group.id;
}

export type TestingFeaturesResult = {
  features: Feature[];
  notice?: string;
};

function addPull(
  groups: Map<string, Group>,
  pull: GitHubPull,
  project: ProjectLink | undefined,
  side: "web" | "native",
) {
  const labels = labelNames(pull.labels);
  const ready =
    hasReadyLabel(labels) ||
    (project ? isReadyProjectStatus(project.status) : false);
  if (!ready) return;

  const identity = groupFor(pull, project);
  const current = groups.get(identity.key) ?? {
    id: identity.id,
    title: identity.title,
    projectName: identity.projectName,
    projectStatus: identity.projectStatus,
    projectUrl: identity.projectUrl,
  };
  const next = toPullSide(pull);
  const projectStatus = [identity.projectStatus, current.projectStatus].find(
    (status) => status && isReadyProjectStatus(status),
  );
  groups.set(identity.key, {
    ...current,
    webSlug: side === "web" ? identity.featureSlug : current.webSlug,
    nativeSlug: side === "native" ? identity.featureSlug : current.nativeSlug,
    projectStatus: projectStatus ?? current.projectStatus ?? identity.projectStatus,
    web: side === "web" ? preferNewer(current.web, next) : current.web,
    native: side === "native" ? preferNewer(current.native, next) : current.native,
  });
}

export async function loadTestingFeatures(
  token: string,
): Promise<TestingFeaturesResult> {
  const [webPulls, nativePulls] = await Promise.all([
    listOpenPulls(WEB_REPO, token),
    listOpenPulls(NATIVE_REPO, token),
  ]);
  const pulls = [...webPulls, ...nativePulls];

  let projectNotice: string | undefined;
  let projects = new Map<string, ProjectLink[]>();
  try {
    projects = await loadProjects(pulls, token);
  } catch (error) {
    projectNotice =
      error instanceof GitHubReadError
        ? error.message
        : "GitHub projects could not be read.";
  }

  return {
    features: featuresFromPulls(webPulls, nativePulls, projects),
    notice: projectNotice,
  };
}

export function featuresFromPulls(
  webPulls: GitHubPull[],
  nativePulls: GitHubPull[],
  projects: Map<string, ProjectLink[]>,
) {
  const groups = new Map<string, Group>();
  for (const pull of webPulls) {
    addPull(groups, pull, chooseProject(projects.get(pull.node_id) ?? []), "web");
  }
  for (const pull of nativePulls) {
    addPull(
      groups,
      pull,
      chooseProject(projects.get(pull.node_id) ?? []),
      "native",
    );
  }

  const features = [...groups.values()]
    .flatMap((group) => {
      const primary = group.web ?? group.native;
      if (!primary) return [];
      const updatedAt = [group.web?.updatedAt, group.native?.updatedAt]
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1);

      const feature: Feature = {
        id: featureId(group),
        title: group.title,
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
        projectName: group.projectName,
        projectStatus: group.projectStatus,
        projectUrl: group.projectUrl,
        progress: 0,
        updatedAt: updatedAt ?? primary.updatedAt,
      };

      return [feature];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const used = new Set<string>();
  for (const feature of features) {
    if (!used.has(feature.id)) {
      used.add(feature.id);
      continue;
    }
    const number = feature.projectUrl?.split("/").pop();
    let next = number ? `${feature.id}-${number}` : `${feature.id}-${used.size}`;
    while (used.has(next)) next = `${next}-${used.size}`;
    feature.id = next;
    used.add(next);
  }

  return features;
}

type DeploymentStatus = {
  state: string;
  environment_url?: string | null;
  created_at: string;
};

export function testingUrlFromStatuses(statuses: DeploymentStatus[]) {
  const latest = [...statuses].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  if (!latest || latest.state !== "success") return undefined;
  const url = latest.environment_url?.trim() ?? "";
  return isTestingUrl(url) ? url : undefined;
}

async function latestBackendDeploymentUrl(token: string, branch: string) {
  const deployments = await githubFetch<{ id: number }[]>(
    `/repos/${OWNER}/${WEB_REPO}/deployments?ref=${encodeURIComponent(branch)}&per_page=10`,
    token,
  );

  for (const deployment of deployments) {
    const statuses = await githubFetch<DeploymentStatus[]>(
      `/repos/${OWNER}/${WEB_REPO}/deployments/${deployment.id}/statuses?per_page=5`,
      token,
    );
    const url = testingUrlFromStatuses(statuses);
    if (url) return url;
  }

  return undefined;
}

export async function loadBackendTestingUrls(
  token: string,
  branches: string[],
) {
  const urls: Record<string, string> = {};
  let notice: string | undefined;
  const unique = [...new Set(branches.filter(Boolean))];

  await Promise.all(
    unique.map(async (branch) => {
      try {
        const url = await latestBackendDeploymentUrl(token, branch);
        if (url) urls[branch] = url;
      } catch (error) {
        notice =
          error instanceof GitHubReadError
            ? error.message
            : "Backend deployments could not be read.";
      }
    }),
  );

  return { urls, notice };
}
