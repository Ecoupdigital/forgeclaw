import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return Response.json(
      { error: "Missing 'date' query param (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const content = await core.readDailyLog(date);
  if (content === null) {
    return Response.json({ content: "", source: "core" });
  }

  return Response.json({ content, source: "core" });
}
