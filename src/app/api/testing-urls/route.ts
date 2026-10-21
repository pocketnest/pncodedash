import { getServerSession } from "next-auth";
import { authOptions, isPocketnestEmail } from "@/lib/auth";
import { TestingUrlError, saveTestingUrl } from "@/lib/testing-url-store";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isPocketnestEmail(session?.user?.email)) {
    return Response.json(
      { error: "Sign in with a @pocketnest.com account." },
      { status: 401 },
    );
  }

  let payload: { id?: unknown; testingUrl?: unknown };
  try {
    payload = (await request.json()) as {
      id?: unknown;
      testingUrl?: unknown;
    };
  } catch {
    return Response.json(
      { error: "The testing environment URL could not be saved." },
      { status: 400 },
    );
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  const testingUrl =
    typeof payload.testingUrl === "string" ? payload.testingUrl.trim() : "";

  try {
    await saveTestingUrl(id, testingUrl);
  } catch (error) {
    const message =
      error instanceof TestingUrlError
        ? error.message
        : "The testing environment URL could not be saved.";
    const status = error instanceof TestingUrlError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }

  return Response.json({ testingUrl });
}
