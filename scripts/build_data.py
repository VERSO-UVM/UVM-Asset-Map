"""Clean raw asset-map CSVs, merge enrichment, and emit processed CSVs + viewer JSON.

Usage:
    python3 scripts/build_data.py              # build data/processed/*.csv and web/public/assets.json
    python3 scripts/build_data.py --dump-rows  # print cleaned rows + keyword vocabulary for the enrichment prompt
"""

import argparse
import csv
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data"
PROCESSED_DIR = ROOT / "data" / "processed"
ENRICHMENT_PATH = PROCESSED_DIR / "enrichment.json"
VIEWER_JSON = ROOT / "web" / "public" / "assets.json"

COLUMNS = [
    "College / UVM Unit", "Program Name", "Asset Type", "Email", "Location",
    "Who the Program Serves", "Region Served", "Description",
    "Internal or External Funding?", "How much funding & for how long?",
    "Program Link", "Source Date Last Verified", "Community-Facing", "Confidence",
]
ENRICH_COLUMNS = ["keywords", "audience", "audience_primary", "region_category", "asset_category"]

UNIT_ALIASES = {"UVM-wide / Community-facing": "University-wide"}
CASE_NORMALIZE = {"Community-Facing", "Confidence"}

# Short source names used in the viewer, derived from "CALS_Asset_Map(CALS).csv" -> "CALS".
SOURCE_RE = re.compile(r"\(([^)]+)\)\.csv$")


def decode(raw: bytes) -> str:
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("cp1252", errors="replace")


def clean_text(value: str) -> str:
    value = value.replace("\xa0", " ").replace("�", " ")
    return re.sub(r"\s+", " ", value).strip()


def normalize_value(column: str, value: str) -> str:
    value = clean_text(value)
    if column in CASE_NORMALIZE and value:
        value = value[0].upper() + value[1:].lower()
    if column == "College / UVM Unit":
        value = UNIT_ALIASES.get(value, value)
    return value


def read_raw(path: Path) -> list[dict]:
    """Read one raw CSV, keep only the named columns, drop rows with no Program Name."""
    reader = csv.reader(io.StringIO(decode(path.read_bytes())))
    header = [clean_text(h) for h in next(reader)]
    index = {name: header.index(name) for name in COLUMNS if name in header}
    missing = [c for c in COLUMNS if c not in index]
    if missing:
        raise ValueError(f"{path.name}: missing columns {missing}")
    rows = []
    for raw_row in reader:
        row = {c: normalize_value(c, raw_row[i] if i < len(raw_row) else "") for c, i in index.items()}
        if row["Program Name"]:
            rows.append(row)
    return rows


def raw_files(raw_dir: Path = RAW_DIR) -> list[Path]:
    return sorted(raw_dir.glob("*.csv"))


def source_name(path: Path) -> str:
    m = SOURCE_RE.search(path.name)
    return m.group(1) if m else path.stem


def key(unit: str, name: str) -> tuple[str, str]:
    return (clean_text(unit), clean_text(name))


def load_enrichment(path: Path = ENRICHMENT_PATH) -> dict[tuple[str, str], dict]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {key(e["unit"], e["name"]): e for e in data["programs"]}


def merge(rows: list[dict], enrichment: dict, warn=print) -> list[dict]:
    seen = set()
    out = []
    for row in rows:
        k = key(row["College / UVM Unit"], row["Program Name"])
        e = enrichment.get(k)
        if e is None:
            warn(f"WARNING: no enrichment for {k}")
            e = {}
        seen.add(k)
        out.append({
            **row,
            "keywords": "; ".join(e.get("keywords", [])),
            "audience": "; ".join(e.get("audience", [])),
            "audience_primary": e.get("audience_primary", ""),
            "region_category": e.get("region", ""),
            "asset_category": e.get("asset_category", ""),
        })
    return out, seen


def write_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS + ENRICH_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def split_list(value: str) -> list[str]:
    return [v for v in (s.strip() for s in value.split(";")) if v]


def to_program(row: dict, source: str) -> dict:
    return {
        "id": f"prog:{slug(row['College / UVM Unit'])}:{slug(row['Program Name'])}",
        "source": source,
        "name": row["Program Name"],
        "unit": row["College / UVM Unit"],
        "asset_type": row["Asset Type"],
        "asset_category": row["asset_category"] or "Unspecified",
        "email": row["Email"],
        "location": row["Location"],
        "who_served": row["Who the Program Serves"],
        "region_served": row["Region Served"],
        "description": row["Description"],
        "funding_source": row["Internal or External Funding?"],
        "funding_amount": row["How much funding & for how long?"],
        "link": row["Program Link"],
        "last_verified": row["Source Date Last Verified"],
        "community_facing": row["Community-Facing"],
        "confidence": row["Confidence"],
        "keywords": split_list(row["keywords"]),
        "audience": split_list(row["audience"]) or ["Unknown"],
        "audience_primary": row["audience_primary"] or "Unknown",
        "region_category": row["region_category"] or "Unknown",
    }


def build_tree(programs: list[dict]) -> dict[str, dict]:
    """UVM -> unit -> asset category -> program. Every node records children and descendant-program count."""
    nodes = {"uvm": {"id": "uvm", "type": "root", "label": "UVM", "parent": None, "children": []}}

    def add(node_id: str, type_: str, label: str, parent: str) -> None:
        if node_id not in nodes:
            nodes[node_id] = {"id": node_id, "type": type_, "label": label, "parent": parent, "children": []}
            nodes[parent]["children"].append(node_id)

    for p in programs:
        unit_id = f"unit:{slug(p['unit'])}"
        cat_id = f"cat:{slug(p['unit'])}:{slug(p['asset_category'])}"
        add(unit_id, "unit", p["unit"], "uvm")
        add(cat_id, "category", p["asset_category"], unit_id)
        add(p["id"], "program", p["name"], cat_id)

    def count(node_id: str) -> int:
        node = nodes[node_id]
        node["count"] = 1 if node["type"] == "program" else sum(count(c) for c in node["children"])
        return node["count"]

    count("uvm")
    for node in nodes.values():
        node["children"].sort(key=lambda c: (-nodes[c]["count"], nodes[c]["label"].lower()))
    return nodes


def build(raw_dir: Path = RAW_DIR, processed_dir: Path = PROCESSED_DIR,
          enrichment_path: Path = ENRICHMENT_PATH, viewer_json: Path = VIEWER_JSON, warn=print) -> dict:
    enrichment = load_enrichment(enrichment_path)
    programs, seen = [], set()
    for path in raw_files(raw_dir):
        rows, file_seen = merge(read_raw(path), enrichment, warn)
        seen |= file_seen
        write_csv(rows, processed_dir / path.name)
        programs += [to_program(r, source_name(path)) for r in rows]
    for k in sorted(set(enrichment) - seen):
        warn(f"WARNING: enrichment entry has no matching row: {k}")

    ids = [p["id"] for p in programs]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise ValueError(f"duplicate program ids: {sorted(dupes)}")

    out = {"programs": programs, "nodes": build_tree(programs), "root": "uvm"}
    viewer_json.parent.mkdir(parents=True, exist_ok=True)
    viewer_json.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    return out


def dump_rows(raw_dir: Path = RAW_DIR, enrichment_path: Path = ENRICHMENT_PATH) -> None:
    enrichment = load_enrichment(enrichment_path)
    for path in raw_files(raw_dir):
        for row in read_raw(path):
            k = key(row["College / UVM Unit"], row["Program Name"])
            print(json.dumps({
                "unit": row["College / UVM Unit"],
                "name": row["Program Name"],
                "asset_type": row["Asset Type"],
                "who_served": row["Who the Program Serves"],
                "region_served": row["Region Served"],
                "description": row["Description"],
                "enriched": k in enrichment,
            }, ensure_ascii=False))
    vocab = sorted({kw for e in enrichment.values() for kw in e.get("keywords", [])})
    print("\n# keyword vocabulary:\n" + ", ".join(vocab))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dump-rows", action="store_true", help="print cleaned rows for the enrichment prompt")
    args = parser.parse_args()
    if args.dump_rows:
        dump_rows()
        return 0
    warnings = []
    out = build(warn=lambda m: (warnings.append(m), print(m, file=sys.stderr)))
    print(f"{len(out['programs'])} programs, {len(out['nodes'])} nodes -> {VIEWER_JSON.relative_to(ROOT)}")
    return 1 if warnings else 0


if __name__ == "__main__":
    sys.exit(main())
