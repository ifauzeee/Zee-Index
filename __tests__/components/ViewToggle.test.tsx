import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import ViewToggle from "@/components/file-browser/ViewToggle";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ViewToggle", () => {
  it("renders correctly in list view", () => {
    const handleToggle = vi.fn();
    render(<ViewToggle currentView="list" onToggle={handleToggle} />);

    expect(
      screen.getByRole("button", { name: "listView" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "gridView" }),
    ).toBeInTheDocument();
  });

  it("triggers onToggle with grid when grid button is clicked", () => {
    const handleToggle = vi.fn();
    render(<ViewToggle currentView="list" onToggle={handleToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "gridView" }));
    expect(handleToggle).toHaveBeenCalledWith("grid");
  });

  it("triggers onToggle with list when list button is clicked", () => {
    const handleToggle = vi.fn();
    render(<ViewToggle currentView="grid" onToggle={handleToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "listView" }));
    expect(handleToggle).toHaveBeenCalledWith("list");
  });
});
