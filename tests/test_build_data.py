import csv
import json

import pytest

import build_data as bd

HEADER = ",".join(f'"{c}"' if "," in c else c for c in bd.COLUMNS)


def row(unit="CALS", name="Bee Lab", desc="Bees.", community="yes", confidence="high"):
    values = [unit, name, "Program ", "a@uvm.edu", "Burlington", "Farmers", "Vermont", desc,
              "", "", "", "", community, confidence]
    return ",".join(f'"{v}"' for v in values)


@pytest.fixture
def raw_dir(tmp_path):
    d = tmp_path / "raw"
    d.mkdir()
    return d


def write_enrichment(path, entries):
    path.write_text(json.dumps({"programs": entries}), encoding="utf-8")
    return path


def entry(unit="CALS", name="Bee Lab", **kw):
    return {"unit": unit, "name": name, "keywords": kw.get("keywords", ["bee", "pollinator"]),
            "audience": ["Farmers & Producers"], "audience_primary": "Farmers & Producers",
            "region": "Vermont Statewide", "asset_category": "Research Center/Institute"}


def test_cp1252_fallback_and_nbsp(raw_dir):
    text = HEADER + "\n" + row(desc="Real\xa0world ‘pests’") + "\n"
    (raw_dir / "x(X).csv").write_bytes(text.encode("cp1252"))
    rows = bd.read_raw(raw_dir / "x(X).csv")
    assert rows[0]["Description"] == "Real world ‘pests’"


def test_replacement_char_removed():
    assert bd.clean_text("raised�over half") == "raised over half"


def test_junk_columns_and_blank_rows_dropped(raw_dir):
    junk = "," * 50
    text = (HEADER + ",,," + junk + "\n" + row() + junk + ",Rallython,Fundraiser\n"
            + "," * 13 + "\n" + ",,,,,,,,,,,,,\n")
    (raw_dir / "x(X).csv").write_text(text, encoding="utf-8")
    rows = bd.read_raw(raw_dir / "x(X).csv")
    assert len(rows) == 1
    assert list(rows[0]) == bd.COLUMNS


def test_value_normalization(raw_dir):
    (raw_dir / "x(X).csv").write_text(HEADER + "\n" + row(name=" Bee Lab ") + "\n", encoding="utf-8")
    r = bd.read_raw(raw_dir / "x(X).csv")[0]
    assert r["Community-Facing"] == "Yes"
    assert r["Confidence"] == "High"
    assert r["Program Name"] == "Bee Lab"
    assert r["Asset Type"] == "Program"


def test_unit_alias_merge():
    assert bd.normalize_value("College / UVM Unit", "UVM-wide / Community-facing") == "University-wide"


def test_missing_and_extra_enrichment_warn(raw_dir, tmp_path):
    (raw_dir / "x(X).csv").write_text(HEADER + "\n" + row() + "\n" + row(name="Other") + "\n", encoding="utf-8")
    enrich = write_enrichment(tmp_path / "e.json", [entry(), entry(name="Ghost")])
    warnings = []
    out = bd.build(raw_dir, tmp_path / "proc", enrich, tmp_path / "a.json", warn=warnings.append)
    assert any("no enrichment" in w and "Other" in w for w in warnings)
    assert any("no matching row" in w and "Ghost" in w for w in warnings)
    other = next(p for p in out["programs"] if p["name"] == "Other")
    assert other["keywords"] == [] and other["audience_primary"] == "Unknown"


def test_processed_csv_columns(raw_dir, tmp_path):
    (raw_dir / "x(X).csv").write_text(HEADER + "\n" + row() + "\n", encoding="utf-8")
    enrich = write_enrichment(tmp_path / "e.json", [entry()])
    bd.build(raw_dir, tmp_path / "proc", enrich, tmp_path / "a.json", warn=lambda m: None)
    with (tmp_path / "proc" / "x(X).csv").open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert list(rows[0]) == bd.COLUMNS + bd.ENRICH_COLUMNS
    assert rows[0]["keywords"] == "bee; pollinator"


def test_tree_structure(raw_dir, tmp_path):
    rows = [row(name=f"P{i}") for i in range(4)] + [row(unit="University-wide", name="U1")]
    (raw_dir / "x(X).csv").write_text(HEADER + "\n" + "\n".join(rows) + "\n", encoding="utf-8")
    entries = [entry(name=f"P{i}") for i in range(4)] + [entry(unit="University-wide", name="U1")]
    enrich = write_enrichment(tmp_path / "e.json", entries)
    out = bd.build(raw_dir, tmp_path / "proc", enrich, tmp_path / "a.json", warn=lambda m: None)
    nodes = out["nodes"]
    assert nodes["uvm"]["count"] == 5
    program_ids = {p["id"] for p in out["programs"]}
    leaves = [n for n in nodes.values() if n["type"] == "program"]
    assert {n["id"] for n in leaves} == program_ids and len(leaves) == len(program_ids)
    for n in nodes.values():
        if n["parent"] is not None:
            assert n["id"] in nodes[n["parent"]]["children"]
        if n["type"] != "program":
            assert n["count"] == sum(nodes[c]["count"] for c in n["children"])
    # children sorted by count descending
    assert nodes[nodes["uvm"]["children"][0]]["label"] == "CALS"
