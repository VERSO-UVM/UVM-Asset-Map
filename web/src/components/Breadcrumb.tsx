import type { TreeNode } from "../types";

export function Breadcrumb({ path, onNavigate }: { path: TreeNode[]; onNavigate: (id: string) => void }) {
  return (
    <nav className="breadcrumb" aria-label="Hierarchy">
      {path.map((n, i) => (
        <span key={n.id}>
          {i > 0 && <span className="sep" aria-hidden>›</span>}
          {i === path.length - 1 ? (
            <span aria-current="location">{n.label}</span>
          ) : (
            <button type="button" className="link" onClick={() => onNavigate(n.id)}>{n.label}</button>
          )}
        </span>
      ))}
    </nav>
  );
}
