const CUT =
  /\b(?:our products|read more|get in touch|get your quote|contact with us|feel free to write|key features)\b/i;

export function cleanPublicExcerpt(input: string, max = 280) {
  let text = input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/inquiry now/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const cut = text.search(CUT);
  if (cut > 40) text = text.slice(0, cut).trim();
  text = text
    .replace(/\+?\d[\d\s().-]{8,}\d/g, " ")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const repeated = text.match(/^(.{12,}?)\s+\1(?:\s|$)/i);
  if (repeated) text = text.slice(repeated[1].length).trim();
  const lower = text.toLowerCase();
  for (let length = Math.min(90, text.length); length >= 24; length -= 1) {
    const prefix = lower.slice(0, length).trim();
    if (prefix.length < 24) continue;
    const again = lower.indexOf(prefix, length);
    if (again > length && again < 240) {
      text = text.slice(again).trim();
      break;
    }
  }
  const sentences = text.split(/(?<=[.!?])\s+/).filter((part) => part.length > 24);
  const lead = (sentences.slice(0, 2).join(" ") || text).trim();
  if (!lead) return "";
  if (lead.length <= max) return lead;
  return `${lead.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
