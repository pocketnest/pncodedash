export type TestingUrlMap = Record<string, string>;

const HTTPS_URL = /^https:\/\/\S{1,500}$/;

export function isTestingUrl(url: string) {
  return HTTPS_URL.test(url);
}

export function parseTestingUrls(raw: string | null): TestingUrlMap {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const urls: TestingUrlMap = {};
    for (const [id, url] of Object.entries(parsed)) {
      if (typeof url === "string" && isTestingUrl(url)) urls[id] = url;
    }
    return urls;
  } catch {
    return {};
  }
}

export function withTestingUrl(
  urls: TestingUrlMap,
  id: string,
  url: string,
): TestingUrlMap {
  const next = { ...urls };
  if (url) next[id] = url;
  else delete next[id];
  return next;
}
