/** Parse WCAG criteria from JSON string stored in DB.
 * Handles both old format (["wcag143"]) and new format (["1.4.3"]) */
export function parseWcagTags(tagsJson: string): string[] {
  try {
    const tags: string[] = JSON.parse(tagsJson);
    return tags.map(normalizeWcagId).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

/** Normalize a WCAG ID to standard "X.Y.Z" format.
 * Converts old axe format "wcag143" → "1.4.3", passes through "1.4.3" as-is */
function normalizeWcagId(tag: string): string | null {
  // Already in standard format like "1.4.3"
  if (/^\d+\.\d+\.\d+$/.test(tag)) return tag;
  // Old axe format like "wcag143"
  const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return null;
}

/** Format a criterion ID for display: "1.4.3" → "WCAG 1.4.3" */
export function formatWcagTag(tag: string): string | null {
  const normalized = normalizeWcagId(tag);
  return normalized ? `WCAG ${normalized}` : null;
}

/** Format criteria JSON for table display: '["1.4.3","1.1.1"]' → "1.4.3, 1.1.1" */
export function formatWcagCriteria(tagsJson: string): string {
  const ids = parseWcagTags(tagsJson);
  return ids.length > 0 ? ids.join(', ') : tagsJson;
}
