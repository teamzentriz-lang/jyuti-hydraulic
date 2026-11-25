import { indexingHost } from "@/lib/indexing";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() ?? new URL(request.url).hostname;
  const publicHost = host === indexingHost();
  const rules = publicHost ? "Allow: /\nDisallow: /admin/\nDisallow: /api/admin/" : "Disallow: /";
  return new Response(`User-agent: *\n${rules}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
