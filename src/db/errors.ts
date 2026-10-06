export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export class CmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsError";
  }
}

export type DatabaseFailureReason = "missing" | "schema" | "auth" | "offline";

export type DatabaseFailure = {
  reason: DatabaseFailureReason;
  message: string;
};

type PgLike = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  message?: string;
  cause?: unknown;
};

function readPgError(error: unknown): PgLike {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as PgLike;
    if (record.code || record.constraint || record.constraint_name) return record;
    if (record.cause) queue.push(record.cause);
  }
  return { message: error instanceof Error ? error.message : "" };
}

function safeMessage(message: string) {
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…").slice(0, 400);
}

export function classifyDatabaseError(error: unknown): DatabaseFailure {
  if (error instanceof DatabaseNotConfiguredError) {
    return {
      reason: "missing",
      message: "Add DATABASE_URL to .env.local, then push the schema.",
    };
  }

  const pg = readPgError(error);
  const message = safeMessage(pg.message ?? (error instanceof Error ? error.message : ""));

  if (pg.code === "42P01" || /does not exist/i.test(message)) {
    return {
      reason: "schema",
      message: "The database is reachable, but the CMS tables are not there yet.",
    };
  }

  if (pg.code === "28P01" || pg.code === "3D000" || pg.code === "28000") {
    return {
      reason: "auth",
      message: "Postgres refused the connection. Check the user, password, and database name in DATABASE_URL.",
    };
  }

  return {
    reason: "offline",
    message: message || "Could not reach Postgres.",
  };
}

export function constraintMessage(error: unknown, action: "save" | "delete") {
  const pg = readPgError(error);
  if (pg.code === "23505") {
    if (pg.constraint === "users_email_unique" || pg.constraint_name === "users_email_unique") {
      return "That email is already used by another account.";
    }
    return "That URL, slug, or email is already in use.";
  }
  if (pg.code === "23503") {
    return action === "delete"
      ? "This record is still linked from other content. Remove that link first."
      : "A selected image, category, or product no longer exists. Refresh and choose it again.";
  }
  if (pg.code === "23514") {
    return "A value is outside the allowed range.";
  }
  return null;
}

export function rethrowNavigation(error: unknown) {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = String((error as { digest: unknown }).digest);
    if (digest.startsWith("NEXT_")) throw error;
  }
}

export function toCmsMessage(error: unknown, action: "save" | "delete" = "save") {
  rethrowNavigation(error);
  if (error instanceof CmsError) return error.message;
  const constraint = constraintMessage(error, action);
  if (constraint) return constraint;
  const failure = classifyDatabaseError(error);
  if (failure.reason === "missing" || failure.reason === "schema") return failure.message;
  console.error(error);
  return action === "delete" ? "Could not delete that record." : "Could not save. Check the form and try again.";
}
