import { getServerSession } from "next-auth";
import { authOptions, isPocketnestEmail } from "@/lib/auth";
import { PreviewUrlError, savePreviewUrl } from "@/lib/preview-urls";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isPocketnestEmail(session?.user?.email)) {
    return Response.json(
      { error: "Sign in with a @pocketnest.com account." },
      { status: 401 },
    );
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { error: "GITHUB_TOKEN is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    id?: unknown;
    previewUrl?: unknown;
  };
  const id = typeof body.id === "string" ? body.id : "";
  const previewUrl =
    typeof body.previewUrl === "string" ? body.previewUrl.trim() : "";

  try {
    await savePreviewUrl(token, id, previewUrl);
  } catch (error) {
    const message =
      error instanceof PreviewUrlError
        ? error.message
        : "The preview URL could not be saved.";
    return Response.json({ error: message }, { status: 400 });
  }

  return Response.json({ previewUrl });
}
