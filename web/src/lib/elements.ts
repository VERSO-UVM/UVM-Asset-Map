import type { ElementDefinition } from "cytoscape";
import type { AssetData, Filters } from "../types";
import {
  AUDIENCE_GROUP_NAMES, NODE_SHAPES, audienceColor, programGroup, regionStyle, type Theme,
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
  const rects = mix.map((m) => {
    const w = total ? (m.n / total) * usable : 0;
    const r = `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${BAR_H}" rx="3" fill="${audienceColor(m.group, theme.dark)}"/>`;
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

function size(lines: string[], type: string, shape?: { shape: string; equal: boolean }) {
  const longest = Math.max(...lines.map((l) => l.length), 4);
  if (type !== "program") {
    // Hexagon: slanted sides eat horizontal room, so pad wider.
    return { w: Math.round(longest * 6.8 + 56), h: Math.round(lines.length * 14 + 40) };
  }
  let w = longest * 6.6 + 30;
  let h = lines.length * 14 + 22;
  if (shape?.shape === "round-pentagon") {
    w *= 1.12;
    h *= 1.45; // point on top: give the label room below it
  }
  if (shape?.equal) w = h = Math.max(w, h);
  return { w: Math.round(w), h: Math.round(h) };
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
    const region = isProgram ? regionStyle(programs.get(id)!.region_category) : undefined;
    // Circles and squares get narrower lines so they don't balloon.
    const lines = wrapLabel(n.label, region?.equal ? 13 : CHARS_PER_LINE);
    const count = counts.get(id) ?? 0;
    const label = isProgram ? lines.join("\n") : [...lines, `${count} program${count === 1 ? "" : "s"}`].join("\n");
    const { w, h } = size(isProgram ? lines : [...lines, "00 programs"], n.type, region);
    const d: Record<string, unknown> = {
      id, label, type: n.type, shape: region?.shape ?? NODE_SHAPES[n.type], w, h, count,
      childCount: n.children.filter((c) => (counts.get(c) ?? 0) > 0).length,
    };

    if (isProgram) {
      const group = programGroup(programs.get(id)!);
      Object.assign(d, { group, region: region!.name, fill: audienceColor(group, theme.dark) });
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
        fill: n.type === "root" ? (theme.dark ? "#2e3150" : "#e6e9fc") : theme.surface,
        mix: mix.map((x) => `${x.group}: ${x.n}`).join(", "),
        bar: mixBar(mix, theme),
      });
    }

    const classes: string[] = [n.type];
    if (d.shape === "ellipse") classes.push("round");
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

