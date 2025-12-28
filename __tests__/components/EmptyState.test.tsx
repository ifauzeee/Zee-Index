import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmptyState from "@/components/file-browser/EmptyState";
import { Folder } from "lucide-react";

describe("EmptyState", () => {
  it("renders correctly with given props", () => {
    render(
      <EmptyState
        icon={Folder}
        title="No Files Found"
        message="Upload some files to get started."
      />,
    );

    expect(screen.getByText("No Files Found")).toBeInTheDocument();
    expect(
      screen.getByText("Upload some files to get started."),
    ).toBeInTheDocument();
  });
});
