import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";
import { createSearch } from "../lib/search";
import { programs } from "../test/fixture";

describe("SearchBar", () => {
  it("shows highlighted results and picks one on click", async () => {
    const onPick = vi.fn();
    render(<SearchBar search={createSearch(programs)} onPick={onPick} />);
    await userEvent.type(screen.getByRole("searchbox"), "agroecolgy");
    const option = await screen.findByRole("option", { name: /Agroecology/ });
    expect(option.querySelector("mark")).not.toBeNull();
    await userEvent.click(option);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "p:agro" }));
  });

  it("Enter picks the top hit; empty state shown for no matches", async () => {
    const onPick = vi.fn();
    render(<SearchBar search={createSearch(programs)} onPick={onPick} />);
    await userEvent.type(screen.getByRole("searchbox"), "zzzzqqq");
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "bee{Enter}");
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "p:bee" }));
  });
});
