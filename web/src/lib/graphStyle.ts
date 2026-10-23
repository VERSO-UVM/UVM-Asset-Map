import type { Stylesheet } from "cytoscape";
import type { Theme } from "./encoding";
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
        "border-color": "data(borderColor)",
        "border-style": "data(borderStyle)" as never,
        "border-width": "data(borderWidth)",
        label: "data(label)",
        "text-wrap": "wrap",
        "text-valign": "center",
        "text-halign": "center",
        "font-family": '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
        "font-size": 11,
        "line-height": 1.3,
        color: t.ink,
        "transition-property": "opacity",
        "transition-duration": 150,
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
    { selector: "node.unit", style: { "corner-radius": 14 } as never },
    // Categories are soft pills: fully rounded ends.
    { selector: "node.category", style: { "corner-radius": "data(pill)", "font-weight": 600 } as never },
    { selector: "node.focus", style: { "border-color": t.accent, "border-width": 2.5 } },
    {
      selector: "node.selected",
      style: { "underlay-color": t.accent, "underlay-padding": 8, "underlay-opacity": 0.22, "underlay-shape": "round-rectangle" } as never,
    },
    { selector: "node.program.selected", style: { "underlay-shape": "ellipse" } as never },
    {
      selector: "node.highlight",
      style: { "outline-color": t.accent, "outline-width": 3, "outline-offset": 4, "outline-style": "solid", "outline-opacity": 0.8 } as never,
    },
    { selector: "node.dim", style: { opacity: 0.38 } },
    { selector: "node.faded", style: { opacity: 0.5 } },
    {
      selector: "edge",
      style: {
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
