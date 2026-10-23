import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanel } from "./DetailPanel";
import { LIGHT } from "../lib/encoding";
import { makeData } from "../test/fixture";

const data = makeData();
data.programs.find((p) => p.id === "p:plant")!.funding_source = "needs research";

function setup(props: Partial<Parameters<typeof DetailPanel>[0]> = {}) {
  const handlers = { onGo: vi.fn(), onKeyword: vi.fn(), onShowKeywordInGraph: vi.fn() };
  render(<DetailPanel data={data} nodeId="p:plant" keyword={null} theme={LIGHT} {...handlers} {...props} />);
  return handlers;
}

describe("DetailPanel", () => {
  it("renders program fields, keywords and connections", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Plant Diagnostic Clinic" })).toBeInTheDocument();
    expect(screen.getByText("Identifies plant diseases and weeds.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "plant disease" })).toBeInTheDocument();
    expect(screen.getByText("needs research")).toHaveClass("needs");
    expect(screen.getByRole("button", { name: /Testing/ })).toBeInTheDocument(); // in-edge (parent)
  });

  it("clicking a keyword chip calls onKeyword", async () => {
    const h = setup();
    await userEvent.click(screen.getByRole("button", { name: "pest management" }));
    expect(h.onKeyword).toHaveBeenCalledWith("pest management");
  });

  it("shows related programs for the active keyword", async () => {
    const h = setup({ keyword: "pest management" });
    const section = screen.getByRole("region", { name: "Programs tagged pest management" });
    expect(section).toHaveTextContent("Plant Diagnostic Clinic");
    expect(section).toHaveTextContent("Commercial Horticulture Program");
    await userEvent.click(screen.getByRole("button", { name: "Commercial Horticulture Program" }));
    expect(h.onGo).toHaveBeenCalledWith("p:hort");
    await userEvent.click(screen.getByRole("button", { name: "Show all in graph" }));
    expect(h.onShowKeywordInGraph).toHaveBeenCalledWith("pest management");
  });

  it("aggregate nodes list children as out-edges and common keywords", async () => {
    const h = setup({ nodeId: "c:testing" });
    expect(screen.getByText("3 programs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "lab testing" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Maple Syrup Quality Testing Lab" }));
    expect(h.onGo).toHaveBeenCalledWith("p:maple");
  });

  it("name-only programs say keywords need research", () => {
    setup({ nodeId: "p:lib" });
    expect(screen.getByText(/No keywords yet/)).toBeInTheDocument();
  });
});
