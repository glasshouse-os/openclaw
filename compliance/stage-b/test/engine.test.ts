/**
 * Stage B — Engine shape + integration-contract tests.
 *
 * These tests pin the public output shape so downstream stages (A, C, the
 * audit log) can rely on the contract. If you change the EvaluationResult
 * shape, update these tests AND README.md → "Integration contract".
 */

import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, evaluate, isBlocked, listRules } from "../src/engine.js";

describe("Stage B — engine contract", () => {
  it("returns a clean result for empty input", () => {
    const r = evaluate("");
    expect(r.severity).toBe("clean");
    expect(r.blocked).toBe(false);
    expect(r.violations).toEqual([]);
    expect(r.engineVersion).toBe(ENGINE_VERSION);
    expect(typeof r.evaluatedAt).toBe("string");
    // Counts struct present + zeroed.
    for (const k of Object.keys(r.summary)) {
      expect(r.summary[k as keyof typeof r.summary]).toBe(0);
    }
  });

  it("blocks on the canonical 7 May breach replica", () => {
    const r = evaluate("DM-ing Blake about the C2U thread.", { currentClient: "Convo" });
    expect(r.blocked).toBe(true);
    expect(r.severity).toBe("block");
    expect(r.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("isBlocked is a true shortcut", () => {
    expect(isBlocked("MEMORY.md says we don't do that.")).toBe(true);
    expect(isBlocked("All good, ready when you are.")).toBe(false);
  });

  it("currentClient suppresses self-references", () => {
    const text = "C2U Meta CAPI is live.";
    const inScope = evaluate(text, { currentClient: "C2U" });
    expect(inScope.severity).toBe("clean");
    const outOfScope = evaluate(text, { currentClient: "GL" });
    expect(outOfScope.severity).toBe("block");
  });

  it("aliases are honoured for the current client", () => {
    const text = "Chemist2U Meta CAPI is live.";
    const inScope = evaluate(text, { currentClient: "C2U" });
    expect(inScope.severity).toBe("clean");
  });

  it("extraKnownClients adds transient scope without editing config", () => {
    const text = "Brand new client BoltCorp briefed us yesterday.";
    const unaware = evaluate(text, { currentClient: "GL" });
    // Without extraKnownClients, "BoltCorp" is unknown and won't fire.
    expect(unaware.severity).toBe("clean");
    const aware = evaluate(text, {
      currentClient: "GL",
      extraKnownClients: ["BoltCorp"],
    });
    expect(aware.severity).toBe("block");
    expect(aware.violations.some((v) => v.category === "cross_client")).toBe(true);
  });

  it("skipCategories disables a category entirely", () => {
    const text = "Spawning a subagent for the bulk write.";
    const normal = evaluate(text);
    expect(normal.severity).toBe("warn");
    const skipped = evaluate(text, { skipCategories: ["debugging_narration"] });
    expect(skipped.severity).toBe("clean");
  });

  it("violations include line and column for the FIRST line match", () => {
    const text = "Line one is fine.\nLine two has MEMORY.md in it.\nLine three is fine.";
    const r = evaluate(text);
    expect(r.blocked).toBe(true);
    const m = r.violations.find((v) => v.ruleId === "file_refs.scaffold_md");
    expect(m).toBeDefined();
    expect(m!.line).toBe(2);
    expect(m!.column).toBeGreaterThanOrEqual(1);
  });

  it("multiple matches produce multiple violations", () => {
    const text = "MEMORY.md and SOUL.md both updated.";
    const r = evaluate(text);
    const scaffolds = r.violations.filter((v) => v.ruleId === "file_refs.scaffold_md");
    expect(scaffolds.length).toBe(2);
  });

  it("listRules includes dynamic cross-client rules", () => {
    const rules = listRules({ currentClient: "Convo" });
    const crossClient = rules.filter((r) => r.category === "cross_client");
    expect(crossClient.length).toBeGreaterThanOrEqual(20);
    // The current-client rule should NOT be present.
    expect(crossClient.find((r) => r.id === "cross_client.convo")).toBeUndefined();
  });

  it("summary counts equal violations grouped by category", () => {
    const text = "Let me check MEMORY.md and ping Blake on Slack.";
    const r = evaluate(text);
    let total = 0;
    for (const k of Object.keys(r.summary)) {
      total += r.summary[k as keyof typeof r.summary];
    }
    expect(total).toBe(r.violations.length);
  });

  it("violations sort: block before warn, then by line/column", () => {
    const text = "Let me check.\nMEMORY.md is updated.";
    const r = evaluate(text);
    // First violation must be block-severity.
    expect(r.violations[0]!.severity).toBe("block");
  });
});
