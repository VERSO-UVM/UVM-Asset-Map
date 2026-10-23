import type { AssetData, Program, TreeNode } from "../types";

const base: Omit<Program, "id" | "name" | "unit" | "asset_category" | "keywords" | "audience" | "audience_primary" | "region_category" | "description"> = {
  source: "TEST", asset_type: "", email: "", location: "", who_served: "", region_served: "",
  funding_source: "", funding_amount: "", link: "", last_verified: "", community_facing: "Yes", confidence: "High",
};

function prog(id: string, name: string, unit: string, cat: string, keywords: string[], description: string,
  audience_primary = "Farmers & Producers", region = "Vermont Statewide"): Program {
  return { ...base, id, name, unit, asset_category: cat, keywords, description,
    audience: [audience_primary], audience_primary, region_category: region };
}

export const programs: Program[] = [
  prog("p:maple", "Maple Syrup Quality Testing Lab", "CALS", "Testing", ["maple", "maple syrup", "lab testing"], "Quality-control testing for producers."),
  prog("p:soil", "Agricultural and Environmental Testing Lab", "CALS", "Testing", ["soil testing", "manure", "lab testing"], "Soil and manure testing."),
  prog("p:plant", "Plant Diagnostic Clinic", "CALS", "Testing", ["plant disease", "pest management"], "Identifies plant diseases and weeds.", "General Public"),
  prog("p:hort", "Commercial Horticulture Program", "CALS", "Extension", ["horticulture", "pest management"], "Technical assistance for growers.", "Farmers & Producers", "Regional (Northeast/Cross-border)"),
  prog("p:agro", "Institute for Agroecology", "OVPR", "Research", ["agroecology", "food systems"], "Research on just food systems.", "Researchers", "National/International"),
  prog("p:bee", "Vermont Bee Lab", "OVPR", "Research", ["bee", "pollinator"], "Bee research and soil health workshops are not offered here.", "Researchers"),
  prog("p:gund", "Gund Institute", "OVPR", "Research", ["climate change"], "Environmental research mentioning maple forests.", "Researchers"),
  prog("p:lib", "UVM Libraries", "UW", "Unspecified", [], "", "Unknown", "Unknown"),
];

function node(id: string, type: TreeNode["type"], label: string, parent: string | null, children: string[]): TreeNode {
  return { id, type, label, parent, children, count: 0 };
}

export function makeData(): AssetData {
  const nodes: Record<string, TreeNode> = {
    uvm: node("uvm", "root", "UVM", null, ["u:cals", "u:ovpr", "u:uw"]),
    "u:cals": node("u:cals", "unit", "CALS", "uvm", ["c:testing", "c:ext"]),
    "c:testing": node("c:testing", "category", "Testing", "u:cals", ["p:maple", "p:soil", "p:plant"]),
    "c:ext": node("c:ext", "category", "Extension", "u:cals", ["p:hort"]),
    "u:ovpr": node("u:ovpr", "unit", "OVPR", "uvm", ["c:research"]),
    "c:research": node("c:research", "category", "Research", "u:ovpr", ["p:agro", "p:bee", "p:gund"]),
    "u:uw": node("u:uw", "unit", "UW", "uvm", ["c:unspec"]),
    "c:unspec": node("c:unspec", "category", "Unspecified", "u:uw", ["p:lib"]),
  };
  for (const p of programs) {
    const parent = Object.values(nodes).find((n) => n.children.includes(p.id))!.id;
    nodes[p.id] = node(p.id, "program", p.name, parent, []);
  }
  const count = (id: string): number => {
    const n = nodes[id];
    n.count = n.type === "program" ? 1 : n.children.reduce((s, c) => s + count(c), 0);
    return n.count;
  };
  count("uvm");
  return { programs: structuredClone(programs), nodes, root: "uvm" };
}

export const noFilters = () => ({ hiddenAudiences: new Set<string>(), hiddenRegions: new Set<string>() });
