import type { Flow, Robot } from "@rmo/core";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

export function fuzzyFind<T extends { id: string; name: string }>(
  items: T[],
  query: string,
): { match: T | null; ambiguous: T[] } {
  if (isUuid(query)) {
    const exact = items.find((it) => it.id === query);
    return { match: exact ?? null, ambiguous: [] };
  }
  const exactName = items.find((it) => it.name === query);
  if (exactName) return { match: exactName, ambiguous: [] };

  const q = query.toLowerCase();
  const partial = items.filter(
    (it) => it.name.toLowerCase().includes(q) || it.id.toLowerCase().startsWith(q),
  );
  if (partial.length === 1) return { match: partial[0]!, ambiguous: [] };
  return { match: null, ambiguous: partial };
}

export function describeMatch<T extends Flow | Robot>(items: T[]): string {
  return items.map((it) => `  - ${it.name} (${it.id})`).join("\n");
}
