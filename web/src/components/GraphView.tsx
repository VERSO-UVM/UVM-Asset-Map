import { useMemo, useRef } from "react";
import type { ElementDefinition } from "cytoscape";
import { useCytoscape } from "../hooks/useCytoscape";
import { graphStyle } from "../lib/graphStyle";
import type { Theme } from "../lib/encoding";

interface Props {
  elements: ElementDefinition[];
  theme: Theme;
  onTap: (id: string | null) => void;
}

export function GraphView({ elements, theme, onTap }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const style = useMemo(() => graphStyle(theme), [theme]);
  const cy = useCytoscape(ref, elements, style, onTap);
  return (
    <div className="graph-wrap">
      <div ref={ref} className="graph" role="img" aria-label="Hierarchy graph of UVM programs" />
      <button type="button" className="fit" onClick={() => cy.current?.animate({ fit: { eles: cy.current.elements(), padding: 24 } }, { duration: 200 })}>
        Fit
      </button>
    </div>
  );
}
