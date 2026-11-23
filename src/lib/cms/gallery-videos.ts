/** Extract YouTube watch/embed URLs from Elementor/WordPress gallery HTML. */
export function extractYoutubeVideos(html: string): {
  id: string;
  url: string;
  title: string;
}[] {
  if (!html?.trim()) return [];
  const decoded = html
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\\\//g, "/");

  const found = new Map<string, { id: string; url: string; title: string }>();

  const remember = (raw: string, title = "Gallery video") => {
    const match = raw.match(
      /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
    );
    const id = match?.[1];
    if (!id || found.has(id)) return;
    found.set(id, {
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title,
    });
  };

  for (const match of decoded.matchAll(
    /"youtube_url"\s*:\s*"([^"]+)"/gi,
  )) {
    remember(match[1]);
  }
  for (const match of decoded.matchAll(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{6,}/gi,
  )) {
    remember(match[0]);
  }

  return [...found.values()];
}

export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeThumbUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
