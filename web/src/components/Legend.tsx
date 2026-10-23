import type { Filters } from "../types";
import { AUDIENCE_GROUP_NAMES, REGIONS, audienceColor, type Theme } from "../lib/encoding";

interface Props {
  filters: Filters;
  theme: Theme;
  onToggleAudience: (group: string) => void;
  onToggleRegion: (region: string) => void;
}

const NODE_TYPES: [string, string][] = [
  ["hex", "UVM · college · category"],
  ["oval", "Program (shape = region)"],
];

export function Legend({ filters, theme, onToggleAudience, onToggleRegion }: Props) {
  return (
    <aside className="legend" aria-label="Legend and filters">
      <fieldset>
        <legend>Primary audience <span className="hint">(click to filter)</span></legend>
        {AUDIENCE_GROUP_NAMES.map((g) => {
          const on = !filters.hiddenAudiences.has(g);
          return (
            <button key={g} type="button" className={`toggle ${on ? "" : "off"}`} aria-pressed={on} onClick={() => onToggleAudience(g)}>
              <span className="swatch" style={{ background: audienceColor(g, theme.dark) }} />
              {g}
            </button>
          );
        })}
      </fieldset>
      <fieldset>
        <legend>Region served <span className="hint">(program shape)</span></legend>
        {REGIONS.map((r) => {
          const on = !filters.hiddenRegions.has(r.name);
          return (
            <button key={r.name} type="button" className={`toggle ${on ? "" : "off"}`} aria-pressed={on} onClick={() => onToggleRegion(r.name)}>
              <span className={`shape ${r.icon}`} aria-hidden />
              {r.short}
            </button>
          );
        })}
      </fieldset>
      <fieldset>
        <legend>Node type</legend>
        {NODE_TYPES.map(([s, label]) => (
          <span key={s} className="shape-item"><span className={`shape ${s}`} />{label}</span>
        ))}
      </fieldset>
    </aside>
  );
}
