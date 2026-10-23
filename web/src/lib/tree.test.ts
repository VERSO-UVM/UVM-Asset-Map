import { ancestors, children, closure, expandSmall, filteredCounts, parent, path, programsWithKeyword } from "./tree";
import { makeData, noFilters } from "../test/fixture";

const data = makeData();

describe("tree navigation", () => {
  it("children / parent / ancestors / path", () => {
    expect(children(data, "u:cals").map((n) => n.id)).toEqual(["c:testing", "c:ext"]);
    expect(parent(data, "p:maple")?.id).toBe("c:testing");
    expect(parent(data, "uvm")).toBeNull();
    expect(ancestors(data, "p:maple").map((n) => n.id)).toEqual(["uvm", "u:cals", "c:testing"]);
    expect(path(data, "p:maple").map((n) => n.label)).toEqual(["UVM", "CALS", "Testing", "Maple Syrup Quality Testing Lab"]);
    expect(path(data, "uvm").map((n) => n.id)).toEqual(["uvm"]);
  });
});

describe("expandSmall", () => {
  it("expands nodes with fewer than 3 children recursively, leaves >=3 collapsed", () => {
    const v = expandSmall(data, "uvm");
    // root has 3 units -> shown. CALS has 2 cats -> expanded; Testing has 3 programs -> collapsed; Extension has 1 -> expanded.
    expect(v.has("u:cals") && v.has("c:testing") && v.has("c:ext")).toBe(true);
    expect(v.has("p:hort")).toBe(true);
    expect(v.has("p:maple")).toBe(false);
    // OVPR has 1 category (Research, 3 programs): category shown, its programs not.
    expect(v.has("c:research")).toBe(true);
    expect(v.has("p:agro")).toBe(false);
    // UW -> Unspecified -> Libraries chain of single children is fully expanded.
    expect(v.has("p:lib")).toBe(true);
  });

  it("always shows the focus node's own children", () => {
    const v = expandSmall(data, "c:testing");
    expect([...v].sort()).toEqual(["c:testing", "p:maple", "p:plant", "p:soil"]);
  });

  it("skips nodes with zero filtered programs and re-evaluates branch size", () => {
    const f = noFilters();
    f.hiddenAudiences.add("General Public");
    const counts = filteredCounts(data, f);
    expect(counts.get("c:testing")).toBe(2);
    const v = expandSmall(data, "uvm", counts);
    // Testing now has only 2 visible programs -> expanded inline.
    expect(v.has("p:maple") && v.has("p:soil")).toBe(true);
    expect(v.has("p:plant")).toBe(false);
  });
});

describe("closure & keywords", () => {
  it("closure includes programs and all ancestors", () => {
    expect([...closure(data, ["p:maple", "p:agro"])].sort()).toEqual(
      ["c:research", "c:testing", "p:agro", "p:maple", "u:cals", "u:ovpr", "uvm"].sort(),
    );
  });
  it("programsWithKeyword", () => {
    expect(programsWithKeyword(data, "pest management").map((p) => p.id)).toEqual(["p:plant", "p:hort"]);
  });
});
