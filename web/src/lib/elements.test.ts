import { buildElements, wrapLabel } from "./elements";
import { LIGHT, NODE_SHAPES, audienceColor } from "./encoding";
import { makeData, noFilters } from "../test/fixture";

const data = makeData();
const build = (over: Partial<Parameters<typeof buildElements>[1]> = {}) =>
  buildElements(data, { mode: { kind: "focus", focusId: "uvm" }, filters: noFilters(), selectedId: null, theme: LIGHT, ...over });
const nodes = (els: ReturnType<typeof build>) => els.filter((e) => e.group === "nodes");
const edges = (els: ReturnType<typeof build>) => els.filter((e) => e.group === "edges");
const byId = (els: ReturnType<typeof build>, id: string) => els.find((e) => e.data.id === id)!;

describe("buildElements", () => {
  it("assigns shape per node type", () => {
    const els = build();
    for (const n of nodes(els)) expect(n.data.shape).toBe(NODE_SHAPES[n.data.type as keyof typeof NODE_SHAPES]);
  });

  it("colors programs by primary audience and borders by region", () => {
    const els = build({ mode: { kind: "focus", focusId: "c:ext" } });
    const hort = byId(els, "p:hort");
    expect(hort.data.borderColor).toBe(audienceColor("Farmers & Producers", false));
    expect(hort.data.borderStyle).toBe("solid");
    expect(hort.data.borderWidth).toBe(5); // Regional
    const lib = byId(build({ mode: { kind: "focus", focusId: "c:unspec" } }), "p:lib");
    expect(lib.data.borderStyle).toBe("dashed");
    expect(lib.data.borderColor).toBe(audienceColor("Unknown", false));
  });

  it("puts title and program count in aggregate labels", () => {
    expect(byId(build(), "c:testing").data.label).toBe("Testing\n3 programs");
    expect(byId(build(), "c:ext").data.label).toBe("Extension\n1 program");
  });

  it("aggregates carry an audience-mix bar matching their programs", () => {
    const d = byId(build(), "u:cals").data;
    expect(d.mix).toBe("Farmers & Producers: 3, General Public: 1");
    expect(String(d.bar)).toMatch(/^data:image\/svg\+xml/);
    const svg = decodeURIComponent(String(d.bar));
    expect(svg.match(/<rect/g)).toHaveLength(2);
    expect(svg).toContain(audienceColor("General Public", false));
  });

  it("edges point parent -> child and only between visible nodes", () => {
    const els = build();
    const ids = new Set(nodes(els).map((n) => n.data.id));
    for (const e of edges(els)) {
      expect(ids.has(e.data.source) && ids.has(e.data.target)).toBe(true);
      expect(data.nodes[e.data.target!].parent).toBe(e.data.source);
    }
    expect(byId(els, "uvm->u:cals")).toBeTruthy();
  });

  it("marks in/out edges and dims the rest when a node is selected", () => {
    const els = build({ selectedId: "u:cals" });
    expect(byId(els, "uvm->u:cals").classes).toContain("in");
    expect(byId(els, "u:cals->c:testing").classes).toContain("out");
    expect(byId(els, "uvm->u:ovpr").classes).toContain("dim");
    expect(byId(els, "u:cals").classes).toContain("selected");
    expect(byId(els, "uvm").classes).toContain("neighbor");
    expect(byId(els, "u:ovpr").classes).toContain("dim");
  });

  it("does not dim when the selected node is the focus, or in subset mode", () => {
    const els = build({ mode: { kind: "focus", focusId: "u:cals" }, selectedId: "u:cals" });
    expect(els.some((e) => e.classes?.includes("dim"))).toBe(false);
    const sub = build({ mode: { kind: "subset", programIds: ["p:plant", "p:hort"] }, selectedId: "p:hort" });
    expect(sub.some((e) => e.classes?.includes("dim"))).toBe(false);
  });

  it("subset mode counts only subset programs", () => {
    const els = build({ mode: { kind: "subset", programIds: ["p:plant", "p:hort"] } });
    expect(byId(els, "u:cals").data.count).toBe(2);
    expect(byId(els, "c:testing").data.label).toBe("Testing\n1 program");
  });

  it("shows the focus's parent as faded", () => {
    const els = build({ mode: { kind: "focus", focusId: "c:testing" } });
    expect(byId(els, "u:cals").classes).toContain("faded");
    expect(byId(els, "c:testing").classes).toContain("focus");
  });

  it("subset mode shows the closure of the given programs", () => {
    const els = build({ mode: { kind: "subset", programIds: ["p:plant", "p:hort"] } });
    expect(nodes(els).map((n) => n.data.id).sort()).toEqual(["c:ext", "c:testing", "p:hort", "p:plant", "u:cals", "uvm"]);
  });

  it("filters remove programs and update counts", () => {
    const f = noFilters();
    f.hiddenRegions.add("Vermont Statewide");
    const els = build({ filters: f, mode: { kind: "focus", focusId: "u:cals" } });
    expect(els.find((e) => e.data.id === "p:maple")).toBeUndefined();
    expect(byId(els, "c:ext").data.count).toBe(1);
    expect(byId(els, "c:testing")).toBeUndefined();
  });

  it("highlight class applied", () => {
    const els = build({ mode: { kind: "focus", focusId: "c:testing" }, highlightIds: new Set(["p:soil"]) });
    expect(byId(els, "p:soil").classes).toContain("highlight");
  });
});

describe("wrapLabel", () => {
  it("wraps at word boundaries", () => {
    expect(wrapLabel("Maple Syrup Quality Testing Lab", 18)).toEqual(["Maple Syrup", "Quality Testing", "Lab"]);
  });
});
