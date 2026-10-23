import type { NodeType, Program } from "../types";

/**
 * Audience taxonomy (10 values, see prompts/enrich_assets.md) folded into 7 color groups,
 * because more than 8 categorical hues are not distinguishable. Groups map to fixed palette slots
 * so a color always means the same group regardless of filters.
 */
export const AUDIENCE_GROUPS: { group: string; members: string[]; light: string; dark: string }[] = [
  { group: "Farmers & Producers", members: ["Farmers & Producers"], light: "#008300", dark: "#008300" },
  { group: "Researchers", members: ["Researchers"], light: "#2a78d6", dark: "#3987e5" },
  { group: "General Public", members: ["General Public"], light: "#eb6834", dark: "#d95926" },
  { group: "Students & UVM", members: ["Students", "UVM Faculty & Staff"], light: "#6250d6", dark: "#9085e9" },
  { group: "Youth, Families & Schools", members: ["Youth & Families", "Educators & Schools"], light: "#e87ba4", dark: "#d55181" },
  { group: "Businesses & Entrepreneurs", members: ["Businesses & Entrepreneurs"], light: "#eda100", dark: "#c98500" },
  { group: "Government & Nonprofits", members: ["Government & Policymakers", "Nonprofits & Community Orgs"], light: "#1baf7a", dark: "#199e70" },
];
export const UNKNOWN = "Unknown";
const UNKNOWN_COLOR = { light: "#898781", dark: "#898781" };

export function audienceGroup(audience: string): string {
  return AUDIENCE_GROUPS.find((g) => g.members.includes(audience))?.group ?? UNKNOWN;
}

export function audienceColor(group: string, dark: boolean): string {
  const g = AUDIENCE_GROUPS.find((x) => x.group === group);
  const c = g ?? UNKNOWN_COLOR;
  return dark ? c.dark : c.light;
}

export const AUDIENCE_GROUP_NAMES = [...AUDIENCE_GROUPS.map((g) => g.group), UNKNOWN];

/** Region is ordinal: wider reach = heavier border. */
export const REGIONS: { name: string; style: "dotted" | "solid" | "double" | "dashed"; width: number; short: string }[] = [
  { name: "Campus/Burlington Area", style: "dotted", width: 3, short: "Campus/Burlington" },
  { name: "Vermont Statewide", style: "solid", width: 2, short: "Vermont" },
  { name: "Regional (Northeast/Cross-border)", style: "solid", width: 5, short: "Regional" },
  { name: "National/International", style: "double", width: 7, short: "National/Intl" },
  { name: UNKNOWN, style: "dashed", width: 2, short: "Unknown" },
];

export function regionStyle(region: string) {
  return REGIONS.find((r) => r.name === region) ?? REGIONS[REGIONS.length - 1];
}

export const NODE_SHAPES: Record<NodeType, string> = {
  root: "hexagon",
  unit: "round-rectangle",
  category: "round-tag",
  program: "ellipse",
};

export const TYPE_LABELS: Record<NodeType, string> = {
  root: "University",
  unit: "College / Unit",
  category: "Asset category",
  program: "Program",
};

export function programGroup(p: Program): string {
  return audienceGroup(p.audience_primary);
}

export interface Theme {
  dark: boolean;
  surface: string;
  plane: string;
  ink: string;
  ink2: string;
  muted: string;
  hairline: string;
  border: string;
  accent: string;
}

export const LIGHT: Theme = {
  dark: false, surface: "#fcfcfb", plane: "#f9f9f7", ink: "#0b0b0b", ink2: "#52514e",
  muted: "#898781", hairline: "#e1e0d9", border: "#c3c2b7", accent: "#2a78d6",
};
export const DARK: Theme = {
  dark: true, surface: "#1a1a19", plane: "#0d0d0d", ink: "#f0efec", ink2: "#c3c2b7",
  muted: "#898781", hairline: "#2c2c2a", border: "#383835", accent: "#3987e5",
};

/** Mix a hex color toward the surface; used for the light tint inside program nodes so ink text stays legible. */
export function tint(hex: string, surface: string, amount: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(surface);
  return "#" + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, "0")).join("");
}
