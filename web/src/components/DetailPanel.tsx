import type { AssetData, Program, TreeNode } from "../types";
import { TYPE_LABELS, audienceColor, audienceGroup, programGroup, type Theme } from "../lib/encoding";
import { descendantPrograms, programsWithKeyword } from "../lib/tree";

interface Props {
  data: AssetData;
  nodeId: string | null;
  keyword: string | null;
  theme: Theme;
  onGo: (id: string) => void;
  onKeyword: (kw: string | null) => void;
  onShowKeywordInGraph: (kw: string) => void;
}

function NodeLink({ node, onGo }: { node: TreeNode; onGo: (id: string) => void }) {
  return (
    <button type="button" className="link" onClick={() => onGo(node.id)}>
      {node.label}
      {node.type !== "program" && <span className="muted"> ({node.count})</span>}
    </button>
  );
}

function Chips({ keywords, active, onKeyword }: { keywords: string[]; active: string | null; onKeyword: (kw: string) => void }) {
  if (!keywords.length) return <p className="muted">No keywords yet (needs research).</p>;
  return (
    <div className="chips">
      {keywords.map((k) => (
        <button key={k} type="button" className={`chip ${k === active ? "active" : ""}`} onClick={() => onKeyword(k)}>
          {k}
        </button>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  const needs = /needs research/i.test(value);
  const isUrl = /^https?:\/\//i.test(value);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return (
    <>
      <dt>{label}</dt>
      <dd className={needs ? "needs" : ""}>
        {isUrl ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : isEmail ? <a href={`mailto:${value}`}>{value}</a> : value}
      </dd>
    </>
  );
}

function KeywordSection({ data, keyword, onGo, onKeyword, onShow }: {
  data: AssetData; keyword: string; onGo: (id: string) => void; onKeyword: (kw: string | null) => void; onShow: (kw: string) => void;
}) {
  const matches = programsWithKeyword(data, keyword);
  return (
    <section className="keyword-results" aria-label={`Programs tagged ${keyword}`}>
      <header>
        <h3>Programs tagged <em>{keyword}</em> <span className="muted">({matches.length})</span></h3>
        <button type="button" className="link" onClick={() => onKeyword(null)} aria-label="Clear keyword">✕</button>
      </header>
      <ul>
        {matches.map((p) => (
          <li key={p.id}>
            <button type="button" className="link" onClick={() => onGo(p.id)}>{p.name}</button>
            <span className="muted"> · {p.unit}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="primary" onClick={() => onShow(keyword)}>Show all in graph</button>
    </section>
  );
}

function AudienceList({ program, theme }: { program: Program; theme: Theme }) {
  return (
    <ul className="audiences">
      {program.audience.map((a) => (
        <li key={a}>
          <span className="swatch" style={{ background: audienceColor(audienceGroup(a), theme.dark) }} />
          {a}
          {a === program.audience_primary && <span className="muted"> (primary)</span>}
        </li>
      ))}
    </ul>
  );
}

function AudienceMix({ data, nodeId, theme }: { data: AssetData; nodeId: string; theme: Theme }) {
  const tally = new Map<string, number>();
  for (const id of descendantPrograms(data, nodeId)) {
    const g = programGroup(data.programs.find((p) => p.id === id)!);
    tally.set(g, (tally.get(g) ?? 0) + 1);
  }
  const rows = [...tally].sort((a, b) => b[1] - a[1]);
  return (
    <>
      <h3>Primary audiences</h3>
      <ul className="audiences">
        {rows.map(([g, n]) => (
          <li key={g}>
            <span className="swatch" style={{ background: audienceColor(g, theme.dark) }} />
            {g} <span className="muted">· {n}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function DetailPanel({ data, nodeId, keyword, theme, onGo, onKeyword, onShowKeywordInGraph }: Props) {
  const node = nodeId ? data.nodes[nodeId] : null;
  const kwSection = keyword && (
    <KeywordSection data={data} keyword={keyword} onGo={onGo} onKeyword={onKeyword} onShow={onShowKeywordInGraph} />
  );

  if (!node) {
    return (
      <div className="detail">
        {kwSection}
        <p className="muted">Click a node to see its details. Clicking a unit or category also drills into it.</p>
      </div>
    );
  }

  const parentNode = node.parent ? data.nodes[node.parent] : null;
  const childNodes = node.children.map((c) => data.nodes[c]);
  const program = node.type === "program" ? data.programs.find((p) => p.id === node.id)! : null;

  // Aggregates: most common keywords among descendants, so you can branch out from a category too.
  const topKeywords = program
    ? []
    : Object.entries(
        descendantPrograms(data, node.id)
          .flatMap((id) => data.programs.find((p) => p.id === id)!.keywords)
          .reduce<Record<string, number>>((acc, k) => ((acc[k] = (acc[k] ?? 0) + 1), acc), {}),
      )
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12)
        .map(([k]) => k);

  return (
    <div className="detail">
      {kwSection}
      <p className="type-label">{TYPE_LABELS[node.type]}</p>
      <h2>{node.label}</h2>

      {program ? (
        <>
          <p className="meta">
            <span className="swatch" style={{ background: audienceColor(programGroup(program), theme.dark) }} />
            {program.unit} · {program.asset_category}
            {program.asset_type && program.asset_type !== program.asset_category && <span className="muted asset-type">({program.asset_type})</span>}
          </p>
          {program.description ? <p>{program.description}</p> : <p className="needs">No description yet (needs research).</p>}
          <h3>Keywords</h3>
          <Chips keywords={program.keywords} active={keyword} onKeyword={onKeyword} />
          <h3>Who it serves</h3>
          <AudienceList program={program} theme={theme} />
          {program.who_served && <p className="muted small">Source: “{program.who_served}”</p>}
          <dl>
            <Field label="Region" value={program.region_category} />
            <Field label="Region (source)" value={program.region_served} />
            <Field label="Location" value={program.location} />
            <Field label="Email" value={program.email} />
            <Field label="Link" value={program.link} />
            <Field label="Funding" value={program.funding_source} />
            <Field label="Funding amount" value={program.funding_amount} />
            <Field label="Community-facing" value={program.community_facing} />
            <Field label="Confidence" value={program.confidence} />
            <Field label="Last verified" value={program.last_verified} />
          </dl>
        </>
      ) : (
        <>
          <p className="meta">{node.count} program{node.count === 1 ? "" : "s"}</p>
          <AudienceMix data={data} nodeId={node.id} theme={theme} />
          {topKeywords.length > 0 && (
            <>
              <h3>Common keywords</h3>
              <Chips keywords={topKeywords} active={keyword} onKeyword={onKeyword} />
            </>
          )}
        </>
      )}

      <h3>Connections</h3>
      <dl className="edges">
        <dt>↑ In from</dt>
        <dd>{parentNode ? <NodeLink node={parentNode} onGo={onGo} /> : <span className="muted">— (top level)</span>}</dd>
        <dt>↓ Out to</dt>
        <dd>
          {childNodes.length ? (
            <ul>{childNodes.map((c) => <li key={c.id}><NodeLink node={c} onGo={onGo} /></li>)}</ul>
          ) : (
            <span className="muted">—</span>
          )}
        </dd>
      </dl>
    </div>
  );
}
