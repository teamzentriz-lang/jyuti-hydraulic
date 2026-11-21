import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
  const expirationTime =
    typeof body?.expirationTime === "number" ? body.expirationTime : null;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Invalid push subscription." },
      { status: 400 },
    );
  }

  await getDb()
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      expirationTime: expirationTime ? new Date(expirationTime) : null,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh,
        auth,
        expirationTime: expirationTime ? new Date(expirationTime) : null,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? "",
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
