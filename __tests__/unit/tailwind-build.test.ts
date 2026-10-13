// @vitest-environment node
import { describe, expect, it } from "vitest";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

// Guards the postcss-selector-parser override in package.json: with 6.1.3,
// Tailwind 3 silently dropped every group-* variant from the build.
describe("tailwind build", () => {
  it("generates group and peer variants", async () => {
    const result = await postcss([
      tailwindcss({
        content: [
          {
            raw: '<div class="group-hover:block group-focus-within:underline peer-checked:hidden">',
            extension: "html",
          },
        ],
        corePlugins: { preflight: false },
      }),
    ]).process("@tailwind utilities;", { from: undefined });

    expect(result.css).toContain(".group:hover .group-hover\\:block");
    expect(result.css).toContain(
      ".group:focus-within .group-focus-within\\:underline",
    );
    expect(result.css).toContain(".peer:checked ~ .peer-checked\\:hidden");
  });
});
