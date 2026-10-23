import type { NodeType, Program } from "../types";

/** One duration for every graph transition: layout moves, fades, and viewport fits. */
export const TRANSITION_MS = 450;

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

/** Saturated base hue for a group (the validated palette slot). */
export function audienceBase(group: string, dark: boolean): string {
  const c = AUDIENCE_GROUPS.find((x) => x.group === group) ?? UNKNOWN_COLOR;
  return dark ? c.dark : c.light;
}

/**
 * The softened (pastel) hue used everywhere on screen: the palette slot mixed toward white. Hue order and
 * therefore group separation are preserved; every node also carries a text label, so identity is never color-alone.
 */
export function audienceColor(group: string, dark: boolean): string {
  // Light: pastel toward white, so dark ink stays legible on it. Dark: muted toward the dark surface, for light ink.
  return dark ? tint(audienceBase(group, true), "#211f29", 0.55) : tint(audienceBase(group, false), "#ffffff", 0.5);
}

export const AUDIENCE_GROUP_NAMES = [...AUDIENCE_GROUPS.map((g) => g.group), UNKNOWN];

/** Region served is encoded by program shape (no borders). */
export type ProgramShape = "ellipse" | "round-rectangle" | "round-pentagon";
export const REGIONS: { name: string; shape: ProgramShape; equal: boolean; icon: string; short: string }[] = [
  { name: "Campus/Burlington Area", shape: "ellipse", equal: true, icon: "circle", short: "Campus/Burlington" },
  { name: "Vermont Statewide", shape: "ellipse", equal: false, icon: "oval", short: "Vermont" },
  { name: "Regional (Northeast/Cross-border)", shape: "round-rectangle", equal: false, icon: "box", short: "Regional" },
  { name: "National/International", shape: "round-pentagon", equal: false, icon: "pentagon", short: "National/Intl" },
  { name: UNKNOWN, shape: "round-rectangle", equal: true, icon: "square", short: "Unknown" },
];

export function regionStyle(region: string) {
  return REGIONS.find((r) => r.name === region) ?? REGIONS[REGIONS.length - 1];
}

export const NODE_SHAPES: Record<NodeType, string> = {
  root: "round-hexagon",
  unit: "round-hexagon",
  category: "round-hexagon",
  program: "ellipse", // overridden per program by region shape
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
  dark: false, surface: "#fffefc", plane: "#f6f3fa", ink: "#2d2b38", ink2: "#615d72",
  muted: "#9b97aa", hairline: "#ece8f3", border: "#d8d2e6", accent: "#8f9ef0",
};
export const DARK: Theme = {
  dark: true, surface: "#211f29", plane: "#17161d", ink: "#eceaf4", ink2: "#bcb8cc",
  muted: "#8d899c", hairline: "#2f2d3a", border: "#423e52", accent: "#a6b3f5",
};

/** Mix a hex color toward the surface; used for the light tint inside program nodes so ink text stays legible. */
export function tint(hex: string, surface: string, amount: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(surface);
  return "#" + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, "0")).join("");
}
