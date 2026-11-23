async function main() {
  const res = await fetch(
    "https://jyotihydraulic.com/wp-json/wp/v2/pages?slug=gallery&_fields=content",
  );
  const [page] = (await res.json()) as { content?: { rendered?: string } }[];
  const html = page?.content?.rendered || "";
  const lower = html.toLowerCase();
  console.log("has youtube word", lower.includes("youtube"));
  console.log("has youtu.be", lower.includes("youtu.be"));
  console.log("has video", (html.match(/video/gi) || []).length);

  const videoIds = new Set<string>();
  for (const match of html.matchAll(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/gi,
  )) {
    videoIds.add(match[1]);
  }
  // Elementor often stores youtube_url in data-settings JSON
  for (const match of html.matchAll(
    /youtube_url\\?":\\?"([^"\\]+)/gi,
  )) {
    const raw = match[1].replace(/\\\//g, "/");
    const id =
      raw.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
      )?.[1] || raw;
    if (id) videoIds.add(id);
  }
  for (const match of html.matchAll(/"youtube_url":"([^"]+)"/gi)) {
    const raw = match[1].replace(/\\\//g, "/");
    const id =
      raw.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
      )?.[1] || null;
    if (id) videoIds.add(id);
  }

  console.log("videoIds", [...videoIds]);

  // Show a slice around first youtube occurrence
  const idx = lower.indexOf("youtube");
  if (idx >= 0) console.log("context", html.slice(Math.max(0, idx - 80), idx + 200));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
