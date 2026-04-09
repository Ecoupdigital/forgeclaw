import { mockHarnessFiles } from "@/lib/mock-data";

export async function GET() {
  return Response.json({ files: mockHarnessFiles });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { name, content } = body as { name: string; content: string };

  // In production: writeFile(join(harnessDir, name), content)
  return Response.json({
    success: true,
    name,
    lines: content.split("\n").length,
  });
}
