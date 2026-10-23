import { createSearch, highlight } from "./search";
import { programs } from "../test/fixture";

const search = createSearch(programs);
const names = (q: string) => search(q).map((h) => h.program.name);

describe("search", () => {
  it("ranks an exact name match first", () => {
    expect(names("Plant Diagnostic Clinic")[0]).toBe("Plant Diagnostic Clinic");
  });

  it("tolerates typos", () => {
    expect(names("agroecolgy")[0]).toBe("Institute for Agroecology");
    expect(names("mapel")).toContain("Maple Syrup Quality Testing Lab");
  });

  it("matches substrings", () => {
    expect(names("hort")).toContain("Commercial Horticulture Program");
  });

  it("matches any token of a multi-word query", () => {
    const r = names("bee horticulture");
    expect(r).toContain("Vermont Bee Lab");
    expect(r).toContain("Commercial Horticulture Program");
  });

  it("ranks keyword matches above description-only matches", () => {
    const r = names("maple");
    expect(r.indexOf("Maple Syrup Quality Testing Lab")).toBeLessThan(r.indexOf("Gund Institute"));
    expect(r).toContain("Gund Institute");
  });

  it("returns nothing for empty or 1-char queries", () => {
    expect(search("")).toEqual([]);
    expect(search("  ")).toEqual([]);
    expect(search("a")).toEqual([]);
  });

  it("returns match indices for highlighting", () => {
    const hit = search("maple")[0];
    expect(hit.matches.some((m) => m.key === "name" || m.key === "keywords")).toBe(true);
  });
});

describe("highlight", () => {
  it("splits text into hit and plain segments, merging overlaps", () => {
    expect(highlight("maple syrup", [[0, 2], [2, 4], [8, 9]])).toEqual([
      { text: "maple", hit: true },
      { text: " syrup", hit: false },
    ]);
  });
  it("ignores runs shorter than 3 chars", () => {
    expect(highlight("for", [[1, 2]])).toEqual([{ text: "for", hit: false }]);
  });
  it("returns whole text when no indices", () => {
    expect(highlight("abc", [])).toEqual([{ text: "abc", hit: false }]);
  });
});
