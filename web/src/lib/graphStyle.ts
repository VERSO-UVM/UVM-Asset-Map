import type { Stylesheet } from "cytoscape";
import { TRANSITION_MS, type Theme } from "./encoding";
import { BAR_H } from "./elements";

export function graphStyle(t: Theme): Stylesheet[] {
  return [
    {
      selector: "node",
      style: {
        shape: "data(shape)" as never,
        width: "data(w)",
        height: "data(h)",
        "background-color": "data(fill)",
        "border-width": 0,
        label: "data(label)",
        "text-wrap": "wrap",
        "text-valign": "center",
        "text-halign": "center",
        "font-family": '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
        "font-size": 11,
        "line-height": 1.3,
        color: t.ink,
        "transition-property": "opacity",
        "transition-duration": TRANSITION_MS,
        "transition-timing-function": "ease-in-out-cubic",
      },
    },
    {
      selector: "node.root, node.unit, node.category",
      style: {
        "background-image": "data(bar)",
        "background-fit": "none",
        "background-width": "56%",
        "background-height": BAR_H,
        "background-position-x": "50%",
        "background-position-y": "86%",
        "background-clip": "node",
        "text-margin-y": -6,
      } as never,
    },
    { selector: "node.root, node.unit", style: { "font-weight": 700, "font-size": 12 } },
    { selector: "node.root", style: { "font-size": 13 } },
    { selector: "node.category", style: { "font-weight": 600 } },
    { selector: "node.program", style: { "corner-radius": 12 } as never },
    // The drilled-into node gets a periwinkle wash instead of a border.
    { selector: "node.focus", style: { "background-color": t.dark ? "#2e3150" : "#e6e9fc" } },
    {
      selector: "node.selected",
      style: { "underlay-color": t.accent, "underlay-padding": 8, "underlay-opacity": 0.22, "underlay-shape": "round-rectangle" } as never,
    },
    {
      selector: "node.highlight",
      style: { "underlay-color": t.dark ? "#e0b463" : "#f2c66d", "underlay-padding": 7, "underlay-opacity": 0.45, "underlay-shape": "round-rectangle" } as never,
    },
    { selector: "node.highlight.selected", style: { "underlay-color": t.accent, "underlay-opacity": 0.3 } as never },
    { selector: "node.round", style: { "underlay-shape": "ellipse" } as never },
    // The focus node already has its wash; a rectangular glow around a hexagon reads as a box.
    { selector: "node.focus.selected", style: { "underlay-opacity": 0 } as never },
    { selector: "node.dim", style: { opacity: 0.38 } },
    { selector: "node.faded", style: { opacity: 0.5 } },
    {
      selector: "edge",
      style: {
        "transition-property": "opacity, line-color, width",
        "transition-duration": TRANSITION_MS,
        width: 1.5,
        "curve-style": "round-taxi" as never,
        "taxi-direction": "auto",
        "taxi-radius": 14,
        "line-color": t.border,
        "target-arrow-color": t.border,
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        "line-cap": "round",
      } as never,
    },
    { selector: "edge.in", style: { width: 2.5, "line-color": t.accent, "target-arrow-color": t.accent } },
    { selector: "edge.out", style: { width: 2.5, "line-color": t.ink2, "target-arrow-color": t.ink2, opacity: 0.6 } },
    { selector: "edge.dim", style: { opacity: 0.3 } },
    { selector: "edge.faded", style: { opacity: 0.5, "line-style": "dashed" } },
    { selector: "edge.pending", style: { display: "none" } },
  ];
}
