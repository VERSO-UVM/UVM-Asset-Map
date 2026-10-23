import cytoscape, { type Core, type ElementDefinition, type Stylesheet } from "cytoscape";
import dagre from "cytoscape-dagre";
import { useEffect, useRef, type RefObject } from "react";

cytoscape.use(dagre);

const LAYOUT = {
  name: "dagre",
  rankDir: "TB",
  nodeSep: 18,
  rankSep: 60,
  animate: true,
  animationDuration: 250,
  fit: true,
  padding: 24,
} as cytoscape.LayoutOptions;

/**
 * Owns one cytoscape instance. When the set of node ids changes the graph is replaced and re-laid
 * out; when only data/classes change (selection, highlight) elements are patched in place so
 * positions do not jump.
 */
export function useCytoscape(
  container: RefObject<HTMLDivElement>,
  elements: ElementDefinition[],
  style: Stylesheet[],
  onTap: (id: string | null) => void,
) {
  const cyRef = useRef<Core | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  useEffect(() => {
    if (!container.current) return;
    const cy = cytoscape({
      container: container.current,
      style,
      minZoom: 0.2,
      maxZoom: 1.6,
      boxSelectionEnabled: false,
      autoungrabify: true,
    });
    cy.on("tap", "node", (e) => tapRef.current(e.target.id()));
    cy.on("tap", (e) => {
      if (e.target === cy) tapRef.current(null);
    });
    cy.on("mouseover", "node", () => container.current && (container.current.style.cursor = "pointer"));
    cy.on("mouseout", "node", () => container.current && (container.current.style.cursor = ""));
    cyRef.current = cy;
    const onResize = () => cy.resize();
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
    const nextIds = new Set(elements.map((e) => e.data.id!));
    const curIds = new Set(cy.elements().map((e) => e.id()));
    const sameShape = nextIds.size === curIds.size && [...nextIds].every((id) => curIds.has(id));
    if (sameShape) {
      cy.batch(() => {
        for (const el of elements) {
          const ele = cy.getElementById(el.data.id!);
          ele.data(el.data);
          ele.classes(el.classes ?? "");
        }
      });
      return;
    }
    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });
    // Portrait screens: grow the tree sideways-down instead of a wide, tiny top-down fan.
    const narrow = cy.container()!.clientWidth < 600;
    cy.layout({ ...LAYOUT, rankDir: narrow ? "LR" : "TB" } as unknown as cytoscape.LayoutOptions).run();
  }, [elements]);

  return cyRef;
}
