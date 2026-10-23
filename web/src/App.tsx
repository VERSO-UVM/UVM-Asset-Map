import { useCallback, useMemo, useState } from "react";
import type { AssetData, Filters, Program } from "./types";
import { buildElements, type GraphMode } from "./lib/elements";
import { createSearch } from "./lib/search";
import { isVisibleProgram, path, programsWithKeyword } from "./lib/tree";
import { REGIONS, audienceColor, programGroup } from "./lib/encoding";
import { useTheme } from "./hooks/useTheme";
import { SearchBar } from "./components/SearchBar";
import { Breadcrumb } from "./components/Breadcrumb";
import { Legend } from "./components/Legend";
import { DetailPanel } from "./components/DetailPanel";
import { GraphView } from "./components/GraphView";

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function App({ data }: { data: AssetData }) {
  const theme = useTheme();
  const [mode, setMode] = useState<GraphMode>({ kind: "focus", focusId: data.root });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState<string | null>(null);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [filters, setFilters] = useState<Filters>({ hiddenAudiences: new Set(), hiddenRegions: new Set() });

  const search = useMemo(() => createSearch(data.programs), [data]);
  const highlightIds = useMemo(
    () => new Set(keyword ? programsWithKeyword(data, keyword).map((p) => p.id) : []),
    [data, keyword],
  );
  const elements = useMemo(
    () => buildElements(data, { mode, filters, selectedId, highlightIds, theme }),
    [data, mode, filters, selectedId, highlightIds, theme],
  );
  const visibleIds = useMemo(() => new Set(elements.map((e) => e.data.id!)), [elements]);

  const focusId = mode.kind === "focus" ? mode.focusId : null;
  const crumbs = path(data, selectedId && mode.kind === "subset" ? selectedId : focusId ?? data.root);

  /** Navigate to any node: aggregates become the focus; programs are selected, refocusing on their parent if hidden. */
  const goTo = useCallback(
    (id: string) => {
      const node = data.nodes[id];
      if (node.type !== "program") setMode({ kind: "focus", focusId: id });
      else if (!visibleIds.has(id)) setMode({ kind: "focus", focusId: node.parent! });
      setSelectedId(id);
      setView("graph");
    },
    [data, visibleIds],
  );

  const onTap = useCallback(
    (id: string | null) => {
      if (id === null) return setSelectedId(null);
      const node = data.nodes[id];
      if (node.type !== "program" && id !== focusId) setMode({ kind: "focus", focusId: id });
      setSelectedId(id);
    },
    [data, focusId],
  );

  const onPick = (p: Program) => {
    setMode({ kind: "focus", focusId: data.nodes[p.id].parent! });
    setSelectedId(p.id);
    setView("graph");
  };

  const listPrograms = (mode.kind === "subset"
    ? data.programs.filter((p) => mode.programIds.includes(p.id))
    : data.programs
  ).filter((p) => isVisibleProgram(p, filters));

  return (
    <div className="app">
      <header className="topbar">
        <h1>UVM Asset Map</h1>
        <SearchBar search={search} onPick={onPick} />
        <div className="view-toggle" role="tablist">
          <button type="button" role="tab" aria-selected={view === "graph"} onClick={() => setView("graph")}>Graph</button>
          <button type="button" role="tab" aria-selected={view === "list"} onClick={() => setView("list")}>List</button>
        </div>
      </header>

      <main className="layout">
        <section className="canvas">
          <div className="canvas-bar">
            {mode.kind === "subset" && keyword ? (
              <p className="subset-note">
                Showing {mode.programIds.length} programs tagged <em>{keyword}</em> ·{" "}
                <button type="button" className="link" onClick={() => setMode({ kind: "focus", focusId: data.root })}>back to hierarchy</button>
              </p>
            ) : (
              <Breadcrumb path={crumbs} onNavigate={(id) => { setMode({ kind: "focus", focusId: id }); setSelectedId(id); }} />
            )}
          </div>
          {view === "graph" ? (
            <GraphView elements={elements} theme={theme} onTap={onTap} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Program</th><th>Unit</th><th>Category</th><th>Primary audience</th><th>Region</th></tr>
                </thead>
                <tbody>
                  {listPrograms.map((p) => (
                    <tr key={p.id}>
                      <td><button type="button" className="link" onClick={() => goTo(p.id)}>{p.name}</button></td>
                      <td>{p.unit}</td>
                      <td>{p.asset_category}</td>
                      <td><span className="swatch" style={{ background: audienceColor(programGroup(p), theme.dark) }} />{programGroup(p)}</td>
                      <td>{REGIONS.find((r) => r.name === p.region_category)?.short ?? p.region_category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Legend
            filters={filters}
            theme={theme}
            onToggleAudience={(g) => setFilters((f) => ({ ...f, hiddenAudiences: toggle(f.hiddenAudiences, g) }))}
            onToggleRegion={(r) => setFilters((f) => ({ ...f, hiddenRegions: toggle(f.hiddenRegions, r) }))}
          />
        </section>
        <aside className="panel">
          <DetailPanel
            data={data}
            nodeId={selectedId}
            keyword={keyword}
            theme={theme}
            onGo={goTo}
            onKeyword={setKeyword}
            onShowKeywordInGraph={(kw) => {
              setMode({ kind: "subset", programIds: programsWithKeyword(data, kw).map((p) => p.id) });
              setView("graph");
            }}
          />
        </aside>
      </main>
    </div>
  );
}
