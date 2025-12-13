import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

test("Example test renders correctly", () => {
  const TestComponent = () => <div>Zee-Index Test</div>;
  render(<TestComponent />);
  expect(screen.getByText("Zee-Index Test")).toBeInTheDocument();
});
