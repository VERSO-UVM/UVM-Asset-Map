import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ElementDefinition } from "cytoscape";
import { App } from "./App";
import { makeData } from "./test/fixture";

// Cytoscape needs a real canvas; replace the graph with a list of node buttons that fire onTap.
vi.mock("./components/GraphView", () => ({
  GraphView: ({ elements, onTap }: { elements: ElementDefinition[]; onTap: (id: string | null) => void }) => (
    <ul aria-label="graph">
      {elements.filter((e) => e.group === "nodes").map((e) => (
        <li key={e.data.id}><button type="button" onClick={() => onTap(e.data.id!)}>node:{e.data.id}</button></li>
      ))}
    </ul>
  ),
}));

const graphIds = () =>
  within(screen.getByRole("list", { name: "graph" })).getAllByRole("button").map((b) => b.textContent!.replace("node:", ""));

describe("App", () => {
  it("drilling into a node updates the breadcrumb and visible nodes", async () => {
    render(<App data={makeData()} />);
    expect(graphIds()).toContain("u:cals");
    await userEvent.click(screen.getByRole("button", { name: "node:c:testing" }));
    const crumb = screen.getByRole("navigation", { name: "Hierarchy" });
    expect(crumb).toHaveTextContent("UVM›CALS›Testing");
    expect(graphIds()).toEqual(expect.arrayContaining(["c:testing", "p:maple", "p:soil", "p:plant", "u:cals"]));
    await userEvent.click(within(crumb).getByRole("button", { name: "UVM" }));
    expect(screen.getByRole("navigation", { name: "Hierarchy" })).not.toHaveTextContent("Testing");
  });

  it("legend filters hide programs that do not match", async () => {
    render(<App data={makeData()} />);
    await userEvent.click(screen.getByRole("button", { name: "node:c:testing" }));
    expect(graphIds()).toContain("p:plant");
    await userEvent.click(screen.getByRole("button", { name: "General Public", pressed: true }));
    expect(graphIds()).not.toContain("p:plant");
    expect(graphIds()).toContain("p:maple");
  });

  it("keyword chip -> related list -> show in graph", async () => {
    render(<App data={makeData()} />);
    await userEvent.click(screen.getByRole("button", { name: "node:c:ext" }));
    await userEvent.click(screen.getByRole("button", { name: "node:p:hort" }));
    await userEvent.click(screen.getByRole("button", { name: "pest management" }));
    await userEvent.click(screen.getByRole("button", { name: "Show all in graph" }));
    expect(screen.getByText(/Showing 2 programs tagged/)).toBeInTheDocument();
    expect(graphIds()).toEqual(expect.arrayContaining(["p:hort", "p:plant"]));
    expect(graphIds()).not.toContain("p:maple");
  });

  it("search result focuses its parent and selects it", async () => {
    render(<App data={makeData()} />);
    await userEvent.type(screen.getByRole("searchbox"), "maple syrup{Enter}");
    expect(screen.getByRole("heading", { name: "Maple Syrup Quality Testing Lab" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Hierarchy" })).toHaveTextContent("UVM›CALS›Testing");
  });

  it("list view shows a table of programs", async () => {
    render(<App data={makeData()} />);
    await userEvent.click(screen.getByRole("tab", { name: "List" }));
    expect(screen.getAllByRole("row")).toHaveLength(9); // header + 8
  });
});
