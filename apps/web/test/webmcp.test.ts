import { describe, expect, it } from "vitest";
import {
  bindWebMCP,
  type AgentController,
  type AgentSnapshot,
  type SiteTool,
} from "../src/lib/webmcp.js";

function harness() {
  const tools = new Map<string, SiteTool>();
  const snapshot: AgentSnapshot = {
    status: "empty",
    documentId: null,
    labelCount: 0,
    dpi: 203,
    reviewRequired: false,
    reviewAcknowledged: false,
  };
  let changes = 0;
  const controller: AgentController = {
    snapshot: () => ({ ...snapshot }),
    async loadSample() {
      changes++;
      snapshot.status = "ready";
      snapshot.documentId = "sample-1";
      snapshot.labelCount = 1;
    },
    async configure() {
      changes++;
    },
    async openReview() {
      changes++;
    },
    downloads: () => [],
    download: () => {
      changes++;
    },
  };
  const binding = bindWebMCP(controller, {
    modelContext: {
      async registerTool(tool, options) {
        tools.set(tool.name, tool);
        options.signal.addEventListener(
          "abort",
          () => tools.delete(tool.name),
          { once: true },
        );
      },
    },
  });
  const invoke = (name: string, input: unknown = {}) =>
    tools.get(name)!.execute(input, { signal: new AbortController().signal });
  return {
    tools,
    controller,
    snapshot,
    binding,
    invoke,
    changes: () => changes,
  };
}

describe("CropOtter site tools", () => {
  it("keeps ordinary operation available without WebMCP", async () => {
    const h = harness();
    const unavailable = bindWebMCP(h.controller, {});
    expect(await unavailable.ready).toBe(false);
    unavailable.dispose();
    h.binding.dispose();
  });
  it("returns the current state after an operation and unregisters on disposal", async () => {
    const h = harness();
    expect(await h.binding.ready).toBe(true);
    expect(await h.invoke("cropotter_load_sample")).toMatchObject({
      ok: true,
      status: "ready",
      documentId: "sample-1",
    });
    expect(await h.invoke("cropotter_get_state")).toMatchObject({
      status: "ready",
      labelCount: 1,
    });
    h.binding.dispose();
    expect(h.tools.size).toBe(0);
  });
  it("rejects stale documents, invalid resolutions and attempted review acknowledgement without mutation", async () => {
    const h = harness();
    await h.binding.ready;
    h.snapshot.documentId = "current";
    h.snapshot.status = "ready";
    for (const input of [
      { documentId: "old", dpi: 300 },
      { documentId: "current", dpi: 600 },
      { documentId: "current", acknowledgeReview: true },
      { documentId: "current", filename: "a".repeat(121) },
      null,
    ])
      expect(await h.invoke("cropotter_set_output", input)).toMatchObject({
        ok: false,
      });
    expect(h.changes()).toBe(0);
    h.binding.dispose();
  });
  it("withholds download metadata and downloads until human review is acknowledged", async () => {
    const h = harness();
    await h.binding.ready;
    Object.assign(h.snapshot, {
      documentId: "current",
      status: "needs_review",
      reviewRequired: true,
      labelCount: 1,
    });
    expect(
      await h.invoke("cropotter_get_downloads", { documentId: "current" }),
    ).toMatchObject({ ok: false, code: "REVIEW_REQUIRED" });
    expect(
      await h.invoke("cropotter_download", {
        documentId: "current",
        format: "pdf",
      }),
    ).toMatchObject({ ok: false, code: "REVIEW_REQUIRED" });
    expect(h.changes()).toBe(0);
    h.snapshot.reviewAcknowledged = true;
    expect(
      await h.invoke("cropotter_get_downloads", { documentId: "current" }),
    ).toMatchObject({ ok: true, files: [] });
    h.binding.dispose();
  });
  it("does not mutate a busy page or execute an aborted request", async () => {
    const h = harness();
    await h.binding.ready;
    h.snapshot.status = "processing";
    expect(await h.invoke("cropotter_load_sample")).toMatchObject({
      ok: false,
      code: "BUSY",
    });
    const abort = new AbortController();
    abort.abort();
    expect(
      await h.tools
        .get("cropotter_load_sample")!
        .execute({}, { signal: abort.signal }),
    ).toMatchObject({ ok: false, code: "CANCELLED" });
    expect(h.changes()).toBe(0);
    h.binding.dispose();
  });
  it("removes partial registrations when the browser rejects a tool", async () => {
    const h = harness();
    h.binding.dispose();
    let signal: AbortSignal | undefined;
    const binding = bindWebMCP(h.controller, {
      modelContext: {
        async registerTool(_tool, options) {
          signal = options.signal;
          throw new Error("Permission policy rejected registration");
        },
      },
    });
    expect(await binding.ready).toBe(false);
    expect(signal?.aborted).toBe(true);
  });
});
