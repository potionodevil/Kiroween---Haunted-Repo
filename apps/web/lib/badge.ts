/** Puts the badge under the first "# " heading, or at the very top, with a haunted-repo marker comment. */
export function insertBadge(readme: string, badge: string): string {
  const block = `<!-- haunted-repo: badge -->\n${badge}`;
  const lines = readme.split("\n");
  const h = lines.findIndex((l) => /^#\s/.test(l));
  if (h === -1) return `${block}\n\n${readme}`;
  return [...lines.slice(0, h + 1), "", block, ...lines.slice(h + 1)].join("\n");
}
