async function main() {
  const res = await fetch(
    "https://jyotihydraulic.com/wp-json/wp/v2/pages?slug=gallery&_fields=content",
  );
  const [page] = (await res.json()) as { content?: { rendered?: string } }[];
  const html = page?.content?.rendered || "";
  const embeds = [
    ...html.matchAll(/src=["']([^"']*youtube[^"']*)["']/gi),
  ].map((m) => m[1]);
  const imgs = [
    ...html.matchAll(/src=["']([^"']*wp-content\/uploads[^"']*)["']/gi),
  ].map((m) => m[1]);
  console.log("unique youtube embeds", [...new Set(embeds)]);
  console.log("unique upload imgs count", new Set(imgs).size);
  console.log("upload imgs", [...new Set(imgs)]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
