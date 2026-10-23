import Fuse, { type FuseResultMatch, type IFuseOptions } from "fuse.js";
import type { Program } from "../types";

export interface SearchHit {
  program: Program;
  score: number; // lower is better
  matches: FuseResultMatch[];
}

const OPTIONS: IFuseOptions<Program> = {
  keys: [
    { name: "name", weight: 3 },
    { name: "keywords", weight: 2 },
    { name: "description", weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

/**
 * Fuzzy search over name, keywords and description. Multi-word queries are matched as a whole and
 * per token; a program's score is its best score, improved for each extra token it matches.
 */
export function createSearch(programs: Program[]) {
  const fuse = new Fuse(programs, OPTIONS);
  return (query: string, limit = 20): SearchHit[] => {
    const q = query.trim();
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
    const queries = tokens.length > 1 ? [q, ...tokens] : [q];
    const best = new Map<string, SearchHit & { hits: number }>();
    for (const sub of queries) {
      for (const r of fuse.search(sub)) {
        const prev = best.get(r.item.id);
        const score = r.score ?? 1;
        if (!prev) {
          best.set(r.item.id, { program: r.item, score, matches: [...(r.matches ?? [])], hits: 1 });
        } else {
          prev.score = Math.min(prev.score, score);
          prev.hits += 1;
          prev.matches.push(...(r.matches ?? []));
        }
      }
    }
    return [...best.values()]
      .map(({ hits, ...h }) => ({ ...h, score: h.score / hits }))
      .sort((a, b) => a.score - b.score || a.program.name.localeCompare(b.program.name))
      .slice(0, limit);
  };
}

/** Split text into [plain, matched] segments from Fuse match indices for highlighting. */
export function highlight(text: string, indices: readonly [number, number][], minRun = 3): { text: string; hit: boolean }[] {
  // Fuzzy matches report tiny scattered runs (e.g. "or" in "for"); only highlight meaningful runs.
  const runs = indices.filter(([s, e]) => e - s + 1 >= minRun);
  if (!runs.length) return [{ text, hit: false }];
  const merged = [...runs].sort((a, b) => a[0] - b[0]).reduce<[number, number][]>((acc, [s, e]) => {
    const last = acc[acc.length - 1];
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else acc.push([s, e]);
    return acc;
  }, []);
  const out: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) out.push({ text: text.slice(pos, s), hit: false });
    out.push({ text: text.slice(s, e + 1), hit: true });
    pos = e + 1;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}
