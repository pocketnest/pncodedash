const REPOSITORY = "pocketnest/pncodedash";
const FILE_PATH = "data/preview-urls.json";

export type PreviewUrlMap = Record<string, string>;

type ContentsResponse = {
  sha?: string;
  content?: string;
  message?: string;
};

export class PreviewUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewUrlError";
  }
}

function isPreviewMap(value: unknown): value is PreviewUrlMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((url) => typeof url === "string");
}

async function github(path: string, token: string, init?: RequestInit) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pncodedash",
    },
    cache: "no-store",
  });
}

function decodeContents(content: string) {
  const parsed: unknown = JSON.parse(
    Buffer.from(content, "base64").toString("utf8"),
  );
  return isPreviewMap(parsed) ? parsed : {};
}

async function readPreviewFile(token: string) {
  const response = await github(
    `/repos/${REPOSITORY}/contents/${FILE_PATH}`,
    token,
  );

  if (response.status === 404) return { urls: {}, sha: undefined };
  if (!response.ok) {
    throw new PreviewUrlError("Saved preview URLs could not be read.");
  }

  const body = (await response.json()) as ContentsResponse;
  return {
    urls: body.content ? decodeContents(body.content) : {},
    sha: body.sha,
  };
}

export async function loadPreviewUrls(token: string) {
  try {
    const file = await readPreviewFile(token);
    return file.urls;
  } catch {
    return {};
  }
}

export function assertPreviewUpdate(id: string, previewUrl: string) {
  if (!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id)) {
    throw new PreviewUrlError("That branch could not be updated.");
  }

  if (previewUrl && !/^https:\/\/\S{1,500}$/.test(previewUrl)) {
    throw new PreviewUrlError("Enter an https preview URL.");
  }
}

export async function savePreviewUrl(
  token: string,
  id: string,
  previewUrl: string,
) {
  assertPreviewUpdate(id, previewUrl);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readPreviewFile(token);
    const urls = { ...current.urls };

    if (previewUrl) urls[id] = previewUrl;
    else delete urls[id];

    const response = await github(
      `/repos/${REPOSITORY}/contents/${FILE_PATH}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          message: previewUrl
            ? `Set preview URL for ${id}`
            : `Remove preview URL for ${id}`,
          content: Buffer.from(`${JSON.stringify(urls, null, 2)}\n`).toString(
            "base64",
          ),
          sha: current.sha,
          branch: "main",
        }),
      },
    );

    if (response.ok) return;
    if (response.status === 409 && attempt === 0) continue;

    if (response.status === 403 || response.status === 404) {
      throw new PreviewUrlError(
        "The GitHub token needs permission to edit files in pocketnest/pncodedash.",
      );
    }

    throw new PreviewUrlError("The preview URL could not be saved.");
  }
}
