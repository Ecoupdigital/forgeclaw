import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = Response.json({ ok: true });

  // Clear the auth cookie by setting Max-Age=0
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=0`,
  ];

  response.headers.set("Set-Cookie", cookieParts.join("; "));
  return response;
}
