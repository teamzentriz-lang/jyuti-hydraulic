export function RichTextHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html.trim()) return null;
  return (
    <div
      className={className ?? "rich-text text-muted"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
