import { expect, it } from "vitest";
import { downloadName } from "../src/lib/downloads.js";
it("keeps readable names, strips automatic extensions and rejects path characters", () => {
  expect(downloadName(" Order 204.pdf ")).toBe("Order 204");
  expect(downloadName("../folder\\name:*.PNG")).toBe("folder-name");
  expect(downloadName(" /:*? ")).toBe("label");
  expect(downloadName("a".repeat(150))).toHaveLength(100);
});
