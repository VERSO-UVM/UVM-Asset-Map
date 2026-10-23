import { useMemo, useState } from "react";
import type { Program } from "../types";
import { highlight, type SearchHit } from "../lib/search";

interface Props {
  search: (q: string) => SearchHit[];
  onPick: (program: Program) => void;
}

function Highlighted({ text, hit, field }: { text: string; hit: SearchHit; field: string }) {
  const indices = hit.matches.filter((m) => m.key === field && m.value === text).flatMap((m) => m.indices);
  return (
    <>
      {highlight(text, indices).map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
    </>
  );
}

export function SearchBar({ search, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => search(query), [search, query]);

  const pick = (p: Program) => {
    onPick(p);
    setOpen(false);
  };

  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        type="search"
        placeholder="Search programs, keywords, descriptions…"
        aria-label="Search programs"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) pick(hits[0].program);
          if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
          }
        }}
      />
      {open && query.trim().length >= 2 && (
        <ul className="search-results" role="listbox" aria-label="Search results">
          {hits.length === 0 && <li className="empty">No matches for “{query}”</li>}
          {hits.map((h) => {
            const kwHits = h.matches.filter((m) => m.key === "keywords").map((m) => m.value!);
            const descHit = h.matches.find((m) => m.key === "description");
            return (
              <li key={h.program.id}>
                <button type="button" role="option" aria-selected={false} onClick={() => pick(h.program)}>
                  <span className="result-name">
                    <Highlighted text={h.program.name} hit={h} field="name" />
                  </span>
                  <span className="result-meta">{h.program.unit} · {h.program.asset_category}</span>
                  {kwHits.length > 0 && (
                    <span className="result-kws">
                      {[...new Set(kwHits)].slice(0, 4).map((k) => (
                        <span className="chip small" key={k}>
                          <Highlighted text={k} hit={h} field="keywords" />
                        </span>
                      ))}
                    </span>
                  )}
                  {!kwHits.length && descHit && <span className="result-snippet">{snippet(descHit.value!, descHit.indices)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function snippet(text: string, indices: readonly [number, number][]) {
  const longest = [...indices].sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  if (!longest) return text.slice(0, 90);
  const start = Math.max(0, longest[0] - 40);
  const end = Math.min(text.length, longest[1] + 50);
  const local = indices
    .filter(([s, e]) => s >= start && e < end)
    .map(([s, e]) => [s - start, e - start] as [number, number]);
  return (
    <>
      {start > 0 && "…"}
      {highlight(text.slice(start, end), local).map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
      {end < text.length && "…"}
    </>
  );
}
