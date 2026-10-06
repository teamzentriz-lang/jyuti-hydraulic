import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local, then run this again.");
    process.exit(1);
  }

  const { closeDb, getDb } = await import("../src/db");
  const { users } = await import("../src/db/schema");
  const { ensureSingletons } = await import("../src/lib/cms/queries");
  const { hashPassword } = await import("../src/lib/password");

  await ensureSingletons();
  console.log("Site settings and home page are ready.");

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local to create the first admin.");
    await closeDb();
    return;
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(`Admin already exists for ${email}. Password was left unchanged.`);
  } else {
    await db.insert(users).values({
      email,
      name: "Jyoti Admin",
      role: "admin",
      passwordHash: await hashPassword(password),
    });
    console.log(`Created admin ${email}.`);
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
