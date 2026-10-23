import type { AssetData, Filters, Program, TreeNode } from "../types";
import { programGroup } from "./encoding";

export const SMALL_BRANCH = 3;

export function children(data: AssetData, id: string): TreeNode[] {
  return (data.nodes[id]?.children ?? []).map((c) => data.nodes[c]);
}

export function parent(data: AssetData, id: string): TreeNode | null {
  const p = data.nodes[id]?.parent;
  return p ? data.nodes[p] : null;
}

/** Ancestors from the root down to (but excluding) the node. */
export function ancestors(data: AssetData, id: string): TreeNode[] {
  const out: TreeNode[] = [];
  let cur = parent(data, id);
  while (cur) {
    out.unshift(cur);
    cur = parent(data, cur.id);
  }
  return out;
}

/** Breadcrumb path: root ... node. */
export function path(data: AssetData, id: string): TreeNode[] {
  return [...ancestors(data, id), data.nodes[id]];
}

export function programById(data: AssetData): Map<string, Program> {
  return new Map(data.programs.map((p) => [p.id, p]));
}

export function isVisibleProgram(p: Program, filters: Filters): boolean {
  return !filters.hiddenAudiences.has(programGroup(p)) && !filters.hiddenRegions.has(p.region_category);
}

/** Number of descendant programs that pass the filters (and are in `only`, if given), per node. */
export function filteredCounts(data: AssetData, filters: Filters, only?: Set<string>): Map<string, number> {
  const programs = programById(data);
  const counts = new Map<string, number>();
  const walk = (id: string): number => {
    const n = data.nodes[id];
    const c = n.type === "program"
      ? (isVisibleProgram(programs.get(id)!, filters) && (!only || only.has(id)) ? 1 : 0)
      : n.children.reduce((s, ch) => s + walk(ch), 0);
    counts.set(id, c);
    return c;
  };
  walk(data.root);
  return counts;
}

/**
 * Nodes to draw when focused on `focusId`: the focus, its children, and — for any shown node with
 * fewer than SMALL_BRANCH children — that node's children too, recursively. Small branches are
 * therefore expanded inline instead of needing an extra click.
 * Nodes whose filtered count is zero are skipped.
 */
export function expandSmall(data: AssetData, focusId: string, counts?: Map<string, number>): Set<string> {
  const keep = (id: string) => !counts || (counts.get(id) ?? 0) > 0;
  const visible = new Set<string>([focusId]);
  const expand = (id: string) => {
    for (const c of data.nodes[id].children) {
      if (!keep(c)) continue;
      visible.add(c);
      const kids = data.nodes[c].children.filter(keep);
      if (kids.length > 0 && kids.length < SMALL_BRANCH) expand(c);
    }
  };
  expand(focusId);
  return visible;
}

/** The root-to-leaf closure of a set of programs: every program plus all of its ancestors. */
export function closure(data: AssetData, ids: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    if (!data.nodes[id]) continue;
    out.add(id);
    for (const a of ancestors(data, id)) out.add(a.id);
  }
  return out;
}

export function descendantPrograms(data: AssetData, id: string): string[] {
  const n = data.nodes[id];
  if (n.type === "program") return [id];
  return n.children.flatMap((c) => descendantPrograms(data, c));
}

export function programsWithKeyword(data: AssetData, keyword: string): Program[] {
  return data.programs.filter((p) => p.keywords.includes(keyword));
}
