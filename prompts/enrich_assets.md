# Asset Enrichment Prompt

Standardized prompt for generating the enrichment columns (`keywords`, `audience`,
`audience_primary`, `region_category`, `asset_category`) for UVM asset-map CSVs.
It is run by a person or an assistant (no LLM API). The output goes in
`data/processed/enrichment.json`, which `scripts/build_data.py` merges into the
processed CSVs.

## How to run

1. Get the cleaned rows: `python3 scripts/build_data.py --dump-rows` prints one JSON
   object per program (unit, name, asset type, who served, region, description), marks
   the ones that have no enrichment yet, and prints the current keyword vocabulary.
2. Give the prompt below plus the rows to the assistant.
3. Merge the returned JSON into `data/processed/enrichment.json`. Edit existing entries
   in place, and don't regenerate entries a person has already reviewed.
4. Run `python3 scripts/build_data.py` and `pytest`. The schema test checks the
   output against the vocabularies below.

---

## Prompt

You are tagging university programs so people can search and filter them. For **each**
input row, return one JSON object. Return a JSON array, and nothing else.

```json
{
  "unit": "<College / UVM Unit, copied exactly>",
  "name": "<Program Name, copied exactly>",
  "keywords": ["..."],
  "audience": ["..."],
  "audience_primary": "...",
  "region": "...",
  "asset_category": "..."
}
```

### keywords
- Give 5–10 per program, lowercase, singular ("bee", not "bees"), using hyphens only where the term itself has one ("4-h").
- They are **topical** nouns or short noun phrases: what the program is *about* or *does*
  ("soil health", "pest management", "maple", "youth development", "grant funding").
- Take them only from the name and description. Don't invent anything the text doesn't support.
- Never use generic terms: `uvm`, `university`, `vermont`, `program`, `center`, `institute`,
  `service`, `community`, `research` (unless the program is literally about research
  methods), `education` on its own (a qualified phrase like `stem education` is fine).
- Before you coin a new term, check the **keyword vocabulary** (every keyword already in
  use, printed by `build_data.py --dump-rows`) and reuse a term if it fits.
  Overlapping keywords are what link programs together.
- If the row has **no description**, return `"keywords": []`.

### audience (multi-label, 1–4 values, exact strings)
| Value | Use for |
|---|---|
| Students | UVM or other students, learners in courses |
| UVM Faculty & Staff | internal UVM employees, faculty |
| Researchers | scientists, academic collaborators |
| Farmers & Producers | farmers, growers, foresters, maple producers, beekeepers, landowners managing working land |
| Youth & Families | K-12 youth, children, families, migrant families |
| Educators & Schools | teachers, schools, libraries, agricultural educators |
| Businesses & Entrepreneurs | companies, startups, agricultural businesses |
| Government & Policymakers | agencies, local governments, town commissions, decision-makers |
| Nonprofits & Community Orgs | nonprofits, civic orgs, historical societies, conservation orgs |
| General Public | "anyone", "public", "community members", households, gardeners |

- Base it on "Who the Program Serves" first, and the description second.
- `audience_primary` is the **single** best fit and must also appear in `audience`.
- If both "Who the Program Serves" and the description are empty, set `audience: ["Unknown"]`
  and `audience_primary: "Unknown"`.

### region (single value, exact string)
Choose the **widest** scope the row explicitly states:
- `Campus/Burlington Area`: campus, Burlington, Chittenden County, "greater community"
- `Vermont Statewide`: Vermont, statewide, Vermont towns
- `Regional (Northeast/Cross-border)`: Northeast, New England, NY/NH/Quebec, "Vermont and the region"
- `National/International`: national, international, global, "Anyone" when the program is clearly open worldwide
- `Unknown`: Region Served is empty, or too vague to map

### asset_category (single value, exact string)
| Value | Use for |
|---|---|
| Research Center/Institute | institutes, research centers, labs whose main output is research |
| Extension Program | UVM Extension outreach, technical assistance, natural-resource, youth, or public-media programs |
| Testing & Diagnostic Service | fee or submission-based testing labs, diagnostic clinics |
| Education & Training | trainings, classes, workshops, business guidance, STEM workforce |
| Facility/Farm | physical sites: farms, greenhouses, horse farm, CSA |
| Community Engagement Office | offices that broker UVM–community partnerships, grants hubs, incubators |
| Event/Fundraiser | events, fundraisers, sales |
| Unspecified | Asset Type is empty and the description gives no basis |

If a row fits more than one category, pick the one that best describes **what a community member
would go there for**.
