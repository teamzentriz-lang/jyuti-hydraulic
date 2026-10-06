import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { CmsError } from "@/db/errors";
import { routes } from "@/db/schema";
import { assertPathAllowed, normalizePath, type RouteKind } from "@/lib/paths";

type QueryDb = Pick<AppDatabase, "insert" | "delete" | "select">;

export async function reserveRoute(
  tx: QueryDb,
  input: { path: string; kind: RouteKind; entityId: string; status: "draft" | "published" },
) {
  const path = normalizePath(input.path);
  try {
    assertPathAllowed(path, input.kind);
  } catch (error) {
    throw new CmsError(error instanceof Error ? error.message : "That URL is not allowed.");
  }

  const [taken] = await tx.select().from(routes).where(eq(routes.path, path)).limit(1);
  if (taken && taken.entityId !== input.entityId) {
    throw new CmsError(`/${path}/ is already used by a ${taken.kind}.`);
  }

  await tx.delete(routes).where(and(eq(routes.entityId, input.entityId), eq(routes.kind, input.kind)));
  await tx.insert(routes).values({
    path,
    kind: input.kind,
    entityId: input.entityId,
    status: input.status,
    updatedAt: new Date(),
  });

  return path;
}

export async function releaseRoute(tx: QueryDb, entityId: string, kind: RouteKind) {
  await tx.delete(routes).where(and(eq(routes.entityId, entityId), eq(routes.kind, kind)));
}
