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
  text = text
    .replace(/^.{0,160}?\bmanufacturers?(?:\s+in\s+india)?\s*,\s*/i, "")
    .replace(/^.{0,160}?\bmanufacturers?(?:\s+in\s+india)?\s+(?:are|is)\b[^.?!]*[.?!]\s*/i, "")
    .replace(/^(?:offering)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.;:\-–—]+\s*/, "")
    .trim();
  const boast =
    /\b(sought after|leading manufacturer|benchmark|decades of experience|strong reputation|unwavering commitment)\b/i;
  const application =
    /\b(for|used|ideal|suitable|applications?|machines?|equipment|lifting|pressure|industrial)\b/i;
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 24 && !boast.test(part));
  const useful = sentences.find((part) => application.test(part));
  const ordered = useful ? [useful, ...sentences.filter((part) => part !== useful)] : sentences;
  const count = max <= 180 ? 1 : 2;
  let lead = (ordered.slice(0, count).join(" ") || text).trim();
  if (lead) lead = lead.charAt(0).toUpperCase() + lead.slice(1);
  if (!lead) return "";
  if (lead.length <= max) return lead;
  return `${lead.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function cleanPublicTitle(input: string) {
  const text = input
    .replace(/\s*[|–—-]\s*Jyoti Hydraulic\s*$/i, "")
    .replace(/\s+price\s*$/i, "")
    .replace(/\s+manufacturers?(?:\s+in\s+india)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || input.trim();
}

export function cleanPublicBody(input: string) {
  const text = input
    .replace(/\S+/g, (word) => {
      if (/[a-z][A-Z]/.test(word)) return "";
      if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(word)) return "";
      return word;
    })
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  return text;
}
