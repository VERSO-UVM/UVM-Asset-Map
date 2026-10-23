import type { ElementDefinition } from "cytoscape";
import type { AssetData, Filters } from "../types";
import {
  AUDIENCE_GROUP_NAMES, NODE_SHAPES, audienceColor, programGroup, regionStyle, tint, type Theme,
} from "./encoding";
import { closure, descendantPrograms, expandSmall, filteredCounts, isVisibleProgram, programById } from "./tree";

export type GraphMode = { kind: "focus"; focusId: string } | { kind: "subset"; programIds: string[] };

export interface BuildOptions {
  mode: GraphMode;
  filters: Filters;
  selectedId: string | null;
  highlightIds?: Set<string>;
  theme: Theme;
}

const CHARS_PER_LINE = 18;
export const BAR_W = 100;
export const BAR_H = 6;

/** SVG data URI: one row of segments proportional to audience counts, 2px surface gap between segments. */
export function mixBar(mix: { group: string; n: number }[], theme: Theme): string {
  const total = mix.reduce((s, x) => s + x.n, 0);
  const gap = 2;
  const usable = BAR_W - gap * Math.max(0, mix.length - 1);
  let x = 0;
  const rects = mix.map((m, i) => {
    const w = total ? (m.n / total) * usable : 0;
    const r = `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${BAR_H}" rx="${i === 0 || i === mix.length - 1 ? 2 : 0}" fill="${audienceColor(m.group, theme.dark)}"/>`;
    x += w + gap;
    return r;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_W}" height="${BAR_H}" viewBox="0 0 ${BAR_W} ${BAR_H}">${rects.join("")}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Wrap at word boundaries; used to size nodes so the title fits inside the shape. */
export function wrapLabel(text: string, perLine = CHARS_PER_LINE): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    if (cur && (cur + " " + word).length > perLine) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? cur + " " + word : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

function size(lines: string[], type: string) {
  const longest = Math.max(...lines.map((l) => l.length), 4);
  const padX = type === "program" ? 26 : type === "category" ? 34 : 30;
  return { w: Math.round(longest * 6.6 + padX), h: Math.round(lines.length * 14 + (type === "program" ? 18 : 30)) };
}

/** Pure: turn the tree + UI state into cytoscape elements. All styling values travel in `data`. */
export function buildElements(data: AssetData, opts: BuildOptions): ElementDefinition[] {
  const { mode, filters, selectedId, highlightIds, theme } = opts;
  const programs = programById(data);
  const subset = mode.kind === "subset" ? new Set(mode.programIds) : undefined;
  const counts = filteredCounts(data, filters, subset);

  let visible: Set<string>;
  let faded: string | null = null;
  if (mode.kind === "focus") {
    visible = expandSmall(data, mode.focusId, counts);
    faded = data.nodes[mode.focusId].parent;
    if (faded) visible.add(faded);
  } else {
    visible = closure(data, mode.programIds.filter((id) => isVisibleProgram(programs.get(id)!, filters)));
  }

  // Dim non-neighbors only when the selection is something other than the node we drilled into;
  // selecting the focus itself (the default after a drill) or browsing a keyword subset dims nothing.
  const dimming = mode.kind === "focus" && !!selectedId && selectedId !== mode.focusId && visible.has(selectedId);
  const neighbors = new Set<string>();
  if (dimming) {
    const n = data.nodes[selectedId];
    if (n.parent) neighbors.add(n.parent);
    n.children.forEach((c) => neighbors.add(c));
  }

  const els: ElementDefinition[] = [];
  for (const id of visible) {
    const n = data.nodes[id];
    const isProgram = n.type === "program";
    const lines = wrapLabel(n.label);
    const count = counts.get(id) ?? 0;
    const label = isProgram ? lines.join("\n") : [...lines, `${count} program${count === 1 ? "" : "s"}`].join("\n");
    const { w, h } = size(isProgram ? lines : [...lines, "00 programs"], n.type);
    const d: Record<string, unknown> = {
      id, label, type: n.type, shape: NODE_SHAPES[n.type], w, h, count,
      childCount: n.children.filter((c) => (counts.get(c) ?? 0) > 0).length,
    };

    if (isProgram) {
      const p = programs.get(id)!;
      const group = programGroup(p);
      const color = audienceColor(group, theme.dark);
      const region = regionStyle(p.region_category);
      Object.assign(d, {
        group, region: region.name,
        fill: tint(color, theme.surface, theme.dark ? 0.35 : 0.22),
        borderColor: color, borderStyle: region.style, borderWidth: region.width,
      });
    } else {
      // Stacked bar of the audience-group mix of counted descendant programs, drawn along the node's bottom.
      const tally = new Map<string, number>();
      for (const pid of descendantPrograms(data, id)) {
        const p = programs.get(pid)!;
        if (!isVisibleProgram(p, filters) || (subset && !subset.has(pid))) continue;
        const g = programGroup(p);
        tally.set(g, (tally.get(g) ?? 0) + 1);
      }
      const mix = AUDIENCE_GROUP_NAMES.map((g) => ({ group: g, n: tally.get(g) ?? 0 })).filter((x) => x.n > 0);
      Object.assign(d, {
        fill: theme.surface, borderColor: theme.border, borderStyle: "solid", borderWidth: n.type === "root" ? 3 : 2,
        mix: mix.map((x) => `${x.group}: ${x.n}`).join(", "),
        bar: mixBar(mix, theme),
      });
    }

    const classes: string[] = [n.type];
    if (id === faded) classes.push("faded");
    if (mode.kind === "focus" && id === mode.focusId) classes.push("focus");
    if (id === selectedId) classes.push("selected");
    else if (dimming) classes.push(neighbors.has(id) ? "neighbor" : "dim");
    if (highlightIds?.has(id)) classes.push("highlight");
    els.push({ group: "nodes", data: d, classes: classes.join(" ") });
  }

  for (const id of visible) {
    const p = data.nodes[id].parent;
    if (!p || !visible.has(p)) continue;
    const classes: string[] = [];
    if (selectedId) {
      if (id === selectedId) classes.push("in");
      else if (p === selectedId) classes.push("out");
      else if (dimming) classes.push("dim");
    }
    if (p === faded) classes.push("faded");
    els.push({ group: "edges", data: { id: `${p}->${id}`, source: p, target: id }, classes: classes.join(" ") });
  }
  return els;
}

