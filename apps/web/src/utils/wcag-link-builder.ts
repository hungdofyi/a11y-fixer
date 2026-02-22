/** Parse WCAG tag IDs from axe-core into display labels */
export function parseWcagTags(tagsJson: string): string[] {
  try {
    const tags: string[] = JSON.parse(tagsJson);
    return tags.filter(t => t.startsWith('wcag'));
  } catch {
    return [];
  }
}

/** Format a WCAG tag like "wcag143" into "WCAG 1.4.3" */
export function formatWcagTag(tag: string): string | null {
  const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
  if (match) {
    return `WCAG ${match[1]}.${match[2]}.${match[3]}`;
  }
  // Level tags like "wcag2a", "wcag2aa"
  const levelMatch = tag.match(/^wcag2(a{1,3})$/);
  if (levelMatch) {
    return `WCAG 2 Level ${levelMatch[1]!.toUpperCase()}`;
  }
  // WCAG 2.1/2.2 level tags
  const versionMatch = tag.match(/^wcag2(\d)(a{1,3})$/);
  if (versionMatch) {
    return `WCAG 2.${versionMatch[1]} Level ${versionMatch[2]!.toUpperCase()}`;
  }
  return null;
}
