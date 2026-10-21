import {
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";
import {
  isTestingUrl,
  parseTestingUrls,
  withTestingUrl,
  type TestingUrlMap,
} from "@/lib/testing-urls";

const BLOB_PATH = "testing-urls.json";

export class TestingUrlError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TestingUrlError";
    this.status = status;
  }
}

function assertTestingUpdate(id: string, testingUrl: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(id)) {
    throw new TestingUrlError("That branch could not be updated.");
  }

  if (testingUrl && !isTestingUrl(testingUrl)) {
    throw new TestingUrlError("Enter an https testing environment URL.");
  }
}

async function readTestingFile(): Promise<{
  urls: TestingUrlMap;
  etag?: string;
}> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { urls: {} };

  const result = await get(BLOB_PATH, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200) return { urls: {} };

  const urls = parseTestingUrls(await new Response(result.stream).text());
  return { urls, etag: result.blob.etag };
}

export async function loadTestingUrls(): Promise<TestingUrlMap> {
  try {
    const file = await readTestingFile();
    return file.urls;
  } catch {
    throw new TestingUrlError(
      "Saved testing environment URLs could not be read.",
      500,
    );
  }
}

export async function saveTestingUrl(id: string, testingUrl: string) {
  assertTestingUpdate(id, testingUrl);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new TestingUrlError(
      "Connect a Vercel Blob store to this project so testing environment URLs are shared.",
      500,
    );
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readTestingFile();
    const urls = withTestingUrl(current.urls, id, testingUrl);

    try {
      await put(BLOB_PATH, `${JSON.stringify(urls, null, 2)}\n`, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(current.etag ? { ifMatch: current.etag } : {}),
      });
      return;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError && attempt === 0) {
        continue;
      }
      throw new TestingUrlError(
        "The testing environment URL could not be saved.",
        500,
      );
    }
  }
}
