async function probe(slug: string) {
  const api = `https://jyotihydraulic.com/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=content,link,slug,title`;
  const response = await fetch(api, {
    headers: { "user-agent": "jyuti-probe/1.0" },
    signal: AbortSignal.timeout(25000),
  });
  const rows = (await response.json()) as {
    content?: { rendered?: string };
    title?: { rendered?: string };
    link?: string;
  }[];
  const rendered = rows?.[0]?.content?.rendered ?? "";
  const plain = rendered.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(
    JSON.stringify(
      {
        slug,
        status: response.status,
        count: Array.isArray(rows) ? rows.length : 0,
        title: rows?.[0]?.title?.rendered,
        link: rows?.[0]?.link,
        renderedLen: rendered.length,
        plainLen: plain.length,
        plainPreview: plain.slice(0, 220),
        htmlPreview: rendered.slice(0, 400),
      },
      null,
      2,
    ),
  );
}

async function main() {
  await probe("15-hp-hydraulic-power-pack-manufacturers-in-chhota-udaipur");
  await probe("hydraulic-jack-manufacturers-in-mumbai");
  await probe("fly-ash-brick-hydraulic-power-pack-in-chhota-udaipur");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
