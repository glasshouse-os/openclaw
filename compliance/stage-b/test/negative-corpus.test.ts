/**
 * Stage B — Negative corpus.
 *
 * Clean text that MUST NOT trigger Stage B. Each case is realistic
 * outbound copy that a Glasshouse agent might send in a normal client
 * channel. These tests prevent false-positive creep as the pattern
 * library grows.
 *
 * If you tighten a regex and one of these starts to fail, the regex is
 * too aggressive — fix the regex, don't relax the negative case.
 */

import { describe, expect, it } from "vitest";
import { evaluate } from "../src/engine.js";

interface NegativeCase {
  name: string;
  text: string;
  /** Optional: scope the evaluation. */
  currentClient?: string;
}

const NEGATIVES: NegativeCase[] = [
  {
    name: "natural 'let me know' is not internal monologue",
    text: "The campaign is live — let me know when you've had a chance to review.",
  },
  {
    name: "ordinary acknowledgement",
    text: "Thanks, that works for me. I'll send the updated draft by Thursday.",
  },
  {
    name: "client-scoped C2U message in C2U channel",
    text: "C2U board is updated with this week's Meta priorities. Live Plan view filters to client-visible tasks.",
    currentClient: "C2U",
  },
  {
    name: "plain status update",
    text: "Sitemap refresh is complete and resubmitted to GSC. Indexed page count was 14 before; we'll check back in a week.",
  },
  {
    name: "ordinary 'right' word",
    text: "You're right about the canonical tag — I'll fix it on the homepage today.",
  },
  {
    name: "ordinary 'session' word",
    text: "Booked the session with Brett for Tuesday at 2pm.",
  },
  {
    name: "ordinary 'token' word in non-runtime context",
    text: "We added an auth token to the deploy pipeline so future releases are scripted.",
  },
  {
    name: "ordinary 'first' usage",
    text: "First impressions are positive — Cam's signed off on the homepage copy.",
  },
  {
    name: "no-op clean technical update",
    text: "Deploy went through cleanly. Live URL: https://example.com. All assertions pass.",
  },
  {
    name: "ordinary 'good' adjective",
    text: "Good progress today on the schema work — ready for review when you are.",
  },
  {
    name: "ordinary 'now' usage",
    text: "The dashboard is now showing the corrected GA4 events.",
  },
  {
    name: "GL channel mentioning GL is fine",
    text: "GL conversion tracking is live and we can move onto LinkedIn next.",
    currentClient: "GL",
  },
  {
    name: "Convo channel referencing Convo is fine",
    text: "Convo K-01 schema is on the feat branch; ready for QA when you've got time.",
    currentClient: "Convo",
  },
];

describe("Stage B — negative corpus (clean text must not flag)", () => {
  it("has at least 10 cases", () => {
    expect(NEGATIVES.length).toBeGreaterThanOrEqual(10);
  });

  for (const c of NEGATIVES) {
    it(`clean: ${c.name}`, () => {
      const result = evaluate(c.text, c.currentClient ? { currentClient: c.currentClient } : {});
      if (result.severity !== "clean") {
        // Build a friendly failure message so it's obvious which rule is
        // over-matching.
        const summary = result.violations
          .map((v) => `[${v.severity}] ${v.ruleId} → "${v.match}"`)
          .join("\n  ");
        throw new Error(
          `Expected CLEAN but got ${result.severity}.\n  Violations:\n  ${summary}\n  Input: ${JSON.stringify(c.text)}`,
        );
      }
      expect(result.severity).toBe("clean");
      expect(result.blocked).toBe(false);
      expect(result.violations).toHaveLength(0);
    });
  }
});
