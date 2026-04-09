import { mockConfig } from "@/lib/mock-data";

export async function GET() {
  return Response.json({ config: mockConfig });
}

export async function PUT(request: Request) {
  const body = await request.json();

  // In production: writeFile(CONFIG_PATH, JSON.stringify(body, null, 2))
  return Response.json({
    success: true,
    config: body,
  });
}
