import { it, expect } from "vitest";
import {
  fileStem,
  validateFile,
  validateLink,
  assertPdfBytes,
} from "../src/lib/input.js";
import { makeArchive } from "../src/lib/downloads.js";
import { unzipSync } from "fflate";
it("keeps signed PDF link queries and rejects credentialed or non-HTTPS links", () => {
  const url = "https://example.com/a?sig=xyz%2Ffoo%2Bbar";
  expect(validateLink(url)).toBe(url);
  expect(() => validateLink("javascript:alert(1)")).toThrow();
  expect(() => validateLink("https://user:secret@example.com/file")).toThrow();
});
it("checks size before reading and verifies the PDF header", () => {
  expect(() =>
    validateFile({
      name: "a.pdf",
      size: 26 * 1024 * 1024,
      type: "application/pdf",
    }),
  ).toThrow(/25 MB/);
  expect(() =>
    validateFile({ name: "empty.pdf", size: 0, type: "application/pdf" }),
  ).toThrow();
  expect(() =>
    assertPdfBytes(new TextEncoder().encode("<html>oops</html>")),
  ).toThrow(/PDF/);
  expect(() =>
    assertPdfBytes(new TextEncoder().encode("%PDF-1.7\n")),
  ).not.toThrow();
});
it("uses safe, useful download names and creates a real PDF + all PNGs ZIP", () => {
  expect(fileStem("../../My label.pdf")).toBe("My-label");
  const pdf = new Uint8Array([1, 2]),
    png = new Uint8Array([3, 4]);
  const result = unzipSync(
    makeArchive("label", pdf, [
      { name: "label-001.png", data: png },
      { name: "label-002.png", data: png },
    ]),
  );
  expect(Object.keys(result)).toEqual([
    "label-4x6.pdf",
    "label-001.png",
    "label-002.png",
  ]);
  expect(result["label-4x6.pdf"]).toEqual(pdf);
  expect(result["label-002.png"]).toEqual(png);
});
