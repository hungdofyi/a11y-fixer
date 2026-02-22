/** Simple template engine with {{var}} and {{#each items}}...{{/each}} support */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  let result = template;

  // Handle {{#each key}}...{{/each}} loops
  result = result.replace(
    /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, key: string, body: string) => {
      const items = data[key];
      if (!Array.isArray(items)) return '';
      return items
        .map((item) => {
          let row = body;
          if (typeof item === 'object' && item !== null) {
            for (const [k, v] of Object.entries(item)) {
              row = row.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
            }
          } else {
            row = row.replace(/\{\{this\}\}/g, String(item));
          }
          return row;
        })
        .join('');
    },
  );

  // Handle {{var}} substitutions
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
    const value = key.split('.').reduce<unknown>((obj, k) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
      return undefined;
    }, data);
    return value !== undefined ? String(value) : '';
  });

  return result;
}
