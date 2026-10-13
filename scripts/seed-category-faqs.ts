import { config } from "dotenv";
import { and, asc, eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function faqTemplates(title: string) {
  const name = title.trim();
  return [
    {
      question: `What is ${name} and where is it used?`,
      answer: `${name} is used in industrial and mobile applications where dependable power transmission, controlled movement, and reliable operation are required. Jyoti Hydraulic supplies solutions selected around the load, operating conditions, duty cycle, and installation requirements of each application.`,
    },
    {
      question: `How do I choose the right ${name}?`,
      answer: `The right selection depends on the required capacity, dimensions, mounting arrangement, operating pressure, speed, duty cycle, and working environment. Share your application details with the Jyoti Hydraulic team and we will help you identify a suitable standard or customized solution.`,
    },
    {
      question: `Can Jyoti Hydraulic customize ${name}?`,
      answer: `Yes. Jyoti Hydraulic can develop ${name} to suit specific dimensions, capacities, mounting styles, materials, and operating conditions. Contact our team with your technical requirements, drawing, or application details for a tailored recommendation and quotation.`,
    },
  ];
}

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { contentFaqs, productCategories } = await import("../src/db/schema");
  const db = getDb();

  const categories = await db
    .select({ id: productCategories.id, title: productCategories.title })
    .from(productCategories)
    .orderBy(asc(productCategories.title));

  let inserted = 0;
  let alreadyComplete = 0;

  for (const category of categories) {
    const existing = await db
      .select({
        question: contentFaqs.question,
        sortOrder: contentFaqs.sortOrder,
        isActive: contentFaqs.isActive,
      })
      .from(contentFaqs)
      .where(
        and(
          eq(contentFaqs.entityKind, "category"),
          eq(contentFaqs.entityId, category.id),
        ),
      )
      .orderBy(asc(contentFaqs.sortOrder));

    const activeCount = existing.filter((item) => item.isActive).length;
    const missing = Math.max(0, 3 - activeCount);
    if (!missing) {
      alreadyComplete += 1;
      continue;
    }

    const existingQuestions = new Set(
      existing.map((item) => item.question.trim().toLowerCase()),
    );
    const additions = faqTemplates(category.title)
      .filter((item) => !existingQuestions.has(item.question.toLowerCase()))
      .slice(0, missing);
    const startOrder = existing.reduce(
      (highest, item) => Math.max(highest, item.sortOrder + 1),
      0,
    );

    if (additions.length) {
      await db.insert(contentFaqs).values(
        additions.map((item, index) => ({
          entityKind: "category" as const,
          entityId: category.id,
          question: item.question,
          answer: item.answer,
          sortOrder: startOrder + index,
          isActive: true,
        })),
      );
      inserted += additions.length;
    }
  }

  console.log(
    `Category FAQ seed complete: ${categories.length} categories checked, ${inserted} FAQs added, ${alreadyComplete} categories already had 3 active FAQs.`,
  );
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
