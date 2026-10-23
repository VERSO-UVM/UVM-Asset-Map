"""Validate the real enrichment.json and the real processed outputs."""
import json
import re
from pathlib import Path

import pytest

import build_data as bd

PROMPT = (bd.ROOT / "prompts" / "enrich_assets.md").read_text(encoding="utf-8")

AUDIENCE = {
    "Students", "UVM Faculty & Staff", "Researchers", "Farmers & Producers", "Youth & Families",
    "Educators & Schools", "Businesses & Entrepreneurs", "Government & Policymakers",
    "Nonprofits & Community Orgs", "General Public",
}
REGION = {"Campus/Burlington Area", "Vermont Statewide", "Regional (Northeast/Cross-border)",
          "National/International", "Unknown"}
CATEGORY = {"Research Center/Institute", "Extension Program", "Testing & Diagnostic Service",
            "Education & Training", "Facility/Farm", "Community Engagement Office",
            "Event/Fundraiser", "Unspecified"}
STOP_TERMS = {"uvm", "university", "vermont", "program", "center", "institute", "service",
              "community", "research", "education"}

ENTRIES = json.loads(bd.ENRICHMENT_PATH.read_text(encoding="utf-8"))["programs"]
ROWS = {bd.key(r["College / UVM Unit"], r["Program Name"]): r
        for p in bd.raw_files() for r in bd.read_raw(p)}


def ids(e):
    return e["name"][:40]


def test_vocabularies_match_prompt():
    for value in AUDIENCE | REGION | CATEGORY:
        assert value in PROMPT, f"{value!r} not documented in prompt"


@pytest.mark.parametrize("e", ENTRIES, ids=ids)
def test_entry_values_in_vocab(e):
    assert e["region"] in REGION
    assert e["asset_category"] in CATEGORY
    if e["audience"] == ["Unknown"]:
        assert e["audience_primary"] == "Unknown"
    else:
        assert set(e["audience"]) <= AUDIENCE
        assert 1 <= len(e["audience"]) <= 4
        assert e["audience_primary"] in e["audience"]


@pytest.mark.parametrize("e", ENTRIES, ids=ids)
def test_keywords(e):
    row = ROWS[bd.key(e["unit"], e["name"])]
    kws = e["keywords"]
    if not row["Description"]:
        assert kws == []
        return
    assert 5 <= len(kws) <= 10
    assert len(set(kws)) == len(kws)
    for kw in kws:
        assert kw == kw.lower().strip() and kw
        assert kw not in STOP_TERMS
        assert re.fullmatch(r"[a-z0-9' -]+", kw), kw


def test_every_row_has_entry_and_vice_versa():
    keys = {bd.key(e["unit"], e["name"]) for e in ENTRIES}
    assert keys == set(ROWS)


def test_real_build_golden(tmp_path):
    warnings = []
    out = bd.build(processed_dir=tmp_path / "proc", viewer_json=tmp_path / "assets.json", warn=warnings.append)
    assert warnings == []
    by_source = {}
    for p in out["programs"]:
        by_source[p["source"]] = by_source.get(p["source"], 0) + 1
    assert by_source == {"CALS": 19, "University-Wide": 20}
    data = json.loads((tmp_path / "assets.json").read_text(encoding="utf-8"))
    assert set(data) == {"programs", "nodes", "root"}
    required = {"id", "name", "unit", "description", "keywords", "audience",
                "audience_primary", "region_category", "asset_category"}
    assert all(required <= set(p) for p in data["programs"])
