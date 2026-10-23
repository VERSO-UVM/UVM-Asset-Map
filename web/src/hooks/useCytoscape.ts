import cytoscape, {
  type Core, type ElementDefinition, type Layouts, type Position, type Stylesheet,
} from "cytoscape";
import dagre from "cytoscape-dagre";
import { useEffect, useRef, type RefObject } from "react";
import { TRANSITION_MS } from "../lib/encoding";

cytoscape.use(dagre);
// Edges between nodes gliding past each other are briefly undrawable; cytoscape logs that as a warning.
cytoscape.warnings(false);

const EASING = "ease-in-out-cubic";

const LAYOUT = {
  name: "dagre",
  rankDir: "TB",
  nodeSep: 18,
  rankSep: 60,
  animate: true,
  animationDuration: TRANSITION_MS,
  animationEasing: EASING,
  fit: true,
  padding: 28,
};

/**
 * Owns one cytoscape instance and morphs it between states instead of rebuilding:
 * - nodes in both states glide to their new layout positions (edges between them follow),
 * - entering nodes start at their nearest on-screen ancestor and fade in as they spread out,
 * - leaving nodes fade out, then are removed,
 * - entering edges fade in once the layout settles (so they never span overlapping nodes).
 * When only data/classes change (selection, highlight) elements are patched in place.
 * The view is fixed: no user zoom or pan; every change refits.
 */
export function useCytoscape(
  container: RefObject<HTMLDivElement>,
  elements: ElementDefinition[],
  style: Stylesheet[],
  onTap: (id: string | null) => void,
) {
  const cyRef = useRef<Core | null>(null);
  const tapRef = useRef(onTap);
  const layoutRef = useRef<Layouts | null>(null);
  tapRef.current = onTap;

  useEffect(() => {
    if (!container.current) return;
    const cy = cytoscape({
      container: container.current,
      style,
      minZoom: 0.2,
      maxZoom: 1.6,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
    });
    cy.on("tap", "node", (e) => {
      if (!e.target.hasClass("exiting")) tapRef.current(e.target.id());
    });
    cy.on("tap", (e) => {
      if (e.target === cy) tapRef.current(null);
    });
    cy.on("mouseover", "node", () => container.current && (container.current.style.cursor = "pointer"));
    cy.on("mouseout", "node", () => container.current && (container.current.style.cursor = ""));
    cyRef.current = cy;
    // Canvas text doesn't re-render when a web font arrives; repaint once fonts are ready.
    document.fonts?.ready.then(() => cyRef.current?.style().update());
    const onResize = () => {
      cy.resize();
      cy.animate({ fit: { eles: cy.elements(), padding: LAYOUT.padding } }, { duration: TRANSITION_MS, easing: EASING });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cyRef.current?.style(style);
  }, [style]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    settle(cy, layoutRef.current);

    const next = new Map(elements.map((e) => [e.data.id!, e]));
    const patch = (el: ElementDefinition) => {
      const ele = cy.getElementById(el.data.id!);
      const pending = ele.hasClass("pending");
      ele.data(el.data);
      ele.classes(el.classes ?? "");
      if (pending) ele.addClass("pending");
    };

    const nextNodeIds = elements.filter((e) => e.group === "nodes").map((e) => e.data.id!);
    const sameShape = nextNodeIds.length === cy.nodes().length && nextNodeIds.every((id) => cy.getElementById(id).nonempty());
    if (sameShape) {
      cy.batch(() => elements.forEach(patch));
      return;
    }

    const exiting = cy.elements().filter((e) => !next.has(e.id()));
    const enteringNodes: ElementDefinition[] = [];
    const enteringEdges: ElementDefinition[] = [];
    for (const el of elements) {
      if (cy.getElementById(el.data.id!).nonempty()) continue;
      (el.group === "nodes" ? enteringNodes : enteringEdges).push(el);
    }

    const center = viewportCenter(cy);
    cy.batch(() => {
      elements.filter((e) => cy.getElementById(e.data.id!).nonempty()).forEach(patch);
      exiting.addClass("exiting");
      cy.add(enteringNodes.map((el) => ({ ...el, position: { ...anchor(cy, next, el, center) } })));
      cy.add(enteringEdges).addClass("pending");
    });
    const added = cy.collection(enteringNodes.map((e) => cy.getElementById(e.data.id!)));
    added.style("opacity", 0);

    // Fade out leavers while the rest re-lays out without them.
    exiting.animate({ style: { opacity: 0 } }, {
      duration: TRANSITION_MS * 0.7,
      easing: EASING,
      complete: () => exiting.remove(),
    });
    added.animate({ style: { opacity: 1 } }, {
      duration: TRANSITION_MS,
      easing: EASING,
      complete: () => added.removeStyle("opacity"),
    });

    // Portrait screens: grow the tree sideways instead of a wide, tiny top-down fan.
    const narrow = cy.container()!.clientWidth < 600;
    cy.style().selector("edge").style("taxi-direction", narrow ? "rightward" : "downward").update();
    const layout = cy.elements().not(exiting).layout({ ...LAYOUT, rankDir: narrow ? "LR" : "TB" } as unknown as cytoscape.LayoutOptions);
    layoutRef.current = layout;
    layout.one("layoutstop", () => {
      if (cy.destroyed()) return;
      const pending = cy.edges(".pending").removeClass("pending");
      pending.style("opacity", 0).animate({ style: { opacity: 1 } }, {
        duration: TRANSITION_MS * 0.6,
        easing: EASING,
        complete: () => pending.removeStyle("opacity"),
      });
    });
    layout.run();
  }, [elements]);

  return cyRef;
}

/** Finish any in-flight transition immediately so a new one starts from a clean state. */
function settle(cy: Core, layout: Layouts | null) {
  layout?.stop();
  cy.elements().stop(true, true);
  cy.elements(".exiting").remove();
  cy.edges(".pending").removeClass("pending");
  cy.elements().removeStyle("opacity");
}

function viewportCenter(cy: Core): Position {
  const ext = cy.extent();
  return { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 };
}

/** Where an entering node starts: its nearest ancestor already on screen, else the viewport center. */
function anchor(cy: Core, next: Map<string, ElementDefinition>, el: ElementDefinition, fallback: Position): Position {
  let parentId = el.data.treeParent as string | null | undefined;
  while (parentId) {
    const onScreen = cy.getElementById(parentId);
    if (onScreen.nonempty() && !onScreen.hasClass("exiting")) return onScreen.position();
    parentId = (next.get(parentId)?.data.treeParent as string | null | undefined) ?? null;
  }
  return fallback;
}
