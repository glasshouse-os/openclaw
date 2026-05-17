/**
 * Stage B — Known-leak corpus.
 *
 * Each case here is a real-world or directly-modelled leak phrasing.
 * Sources:
 *   - `memory/2026-05-07.md` (the breach that triggered Stage B)
 *   - `SOUL.md` Channel-Aware Response Posture (forbidden phrases)
 *   - `AGENTS.md` Standards Enforcement section
 *
 * Format: each case asserts (a) the OVERALL severity, and (b) at least
 * one violation matches the expected ruleId or category. We don't lock
 * to exact violation arrays so adding refinement patterns doesn't break
 * historical cases.
 *
 * Negative tests (clean text that must NOT be flagged) live in
 * `negative-corpus.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { evaluate } from "../src/engine.js";
import type { LeakCategory, Severity } from "../src/types.js";

interface LeakCase {
  name: string;
  text: string;
  /** Expected overall severity. */
  severity: Severity;
  /** At least one violation must match this category (or ruleId, if given). */
  category: LeakCategory;
  /** Optional: a specific rule that must match. */
  ruleId?: string;
  /** Optional: scope the evaluation to a client. */
  currentClient?: string;
}

const LEAKS: LeakCase[] = [
  // -- 1-10: Internal monologue (the 7 May SOUL.md forbidden list) ----------
  {
    name: "let me check",
    text: "Sure thing. Let me check the dashboard and get back to you.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.let_me",
  },
  {
    name: "let me see what's happening",
    text: "Let me see what's happening with the deploy.",
    severity: "warn",
    category: "internal_monologue",
  },
  {
    name: "Now I'll grab the file",
    text: "Now I'll grab the file and run the audit.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.now_ill",
  },
  {
    name: "On it, checking",
    text: "On it, checking the GSC report now.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.on_it_checking",
  },
  {
    name: "Got it — em-dash transition",
    text: "Got it — I'll start with the sitemap refresh.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.got_it_dash",
  },
  {
    name: "OK so opener",
    text: "OK so the issue is the canonical tag is wrong on the homepage.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.ok_so",
  },
  {
    name: "Right, so transition",
    text: "Right, so the next step is to wire up the API.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.right_transition",
  },
  {
    name: "First I'll opener",
    text: "First I'll pull the latest from upstream, then run the test suite.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.first_ill",
  },
  {
    name: "Good — transition",
    text: "Good — that means we can move onto the schema work.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.good_dash",
  },
  {
    name: "Alright, let's transition",
    text: "Alright, let's wrap up the audit and ship.",
    severity: "warn",
    category: "internal_monologue",
    ruleId: "internal_monologue.alright_let",
  },

  // -- 11-15: Tool refs ----------------------------------------------------
  {
    name: "exec tool reference",
    text: "I just ran the exec tool to check the file.",
    severity: "block",
    category: "tool_refs",
    ruleId: "tool_refs.named_tool",
  },
  {
    name: "memory_search snake_case",
    text: "Looked it up with memory_search and confirmed.",
    severity: "block",
    category: "tool_refs",
    ruleId: "tool_refs.snake_case_tool",
  },
  {
    name: "calling the web_search tool",
    text: "Calling the web_search tool to verify the source.",
    severity: "block",
    category: "tool_refs",
  },
  {
    name: "function_calls XML leak",
    text: "Result follows: <function_calls> blah </function_calls>",
    severity: "block",
    category: "tool_refs",
    ruleId: "tool_refs.function_call_syntax",
  },
  {
    name: "tool_result block reference",
    text: "The tool_result came back empty, so I'll retry.",
    severity: "block",
    category: "tool_refs",
    ruleId: "tool_refs.tool_result_block",
  },

  // -- 16-22: Model refs ---------------------------------------------------
  {
    name: "claude-opus-4-7 versioned",
    text: "Switched to claude-opus-4-7 for this run because it's better at long context.",
    severity: "block",
    category: "model_refs",
    ruleId: "model_refs.claude_versioned",
  },
  {
    name: "anthropic/ namespace",
    text: "Default model is anthropic/claude-opus-4-7.",
    severity: "block",
    category: "model_refs",
    ruleId: "model_refs.anthropic_namespace",
  },
  {
    name: "claude sonnet generic",
    text: "Will use claude sonnet for the bulk write.",
    severity: "block",
    category: "model_refs",
    ruleId: "model_refs.claude_versioned",
  },
  {
    name: "GPT alias all-caps",
    text: "Falling back to GPT for the final pass.",
    severity: "block",
    category: "model_refs",
    ruleId: "model_refs.alias_gpt",
  },
  {
    name: "SONNET alias all-caps",
    text: "Spawned a SONNET subagent for the bulk write.",
    severity: "block",
    category: "model_refs",
    ruleId: "model_refs.alias_sonnet",
  },
  {
    name: "HAIKU alias all-caps",
    text: "Use HAIKU for the cheap batch.",
    severity: "block",
    category: "model_refs",
    ruleId: "model_refs.alias_haiku",
  },
  {
    name: "the LLM said",
    text: "The LLM said it couldn't access the file.",
    severity: "warn",
    category: "model_refs",
    ruleId: "model_refs.the_model",
  },

  // -- 23-28: File / config refs ------------------------------------------
  {
    name: "MEMORY.md reference",
    text: "Updated MEMORY.md with the latest pointer.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.scaffold_md",
  },
  {
    name: "SOUL.md reference",
    text: "SOUL.md says we don't do that.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.scaffold_md",
  },
  {
    name: "AGENTS.md reference",
    text: "Per AGENTS.md, every session opens with a daily note.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.scaffold_md",
  },
  {
    name: "memory/2026-05-07.md path",
    text: "Logged in memory/2026-05-07.md for traceability.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.memory_path",
  },
  {
    name: "~/.openclaw config dir",
    text: "Edit ~/.openclaw/openclaw.json and restart the gateway.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.openclaw_dotdir",
  },
  {
    name: "BLUEPRINT versioned filename",
    text: "Per BLUEPRINT-2026-05-17-v3, Stage B comes first.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.blueprint",
  },

  // -- 29-32: Ticket IDs --------------------------------------------------
  {
    name: "Linear ticket GLA-11",
    text: "Closing out GLA-11 once the CI passes.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.linear_ticket",
  },
  {
    name: "Linear ticket CON-83",
    text: "CON-83 is in progress on a feat branch.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.linear_ticket",
  },
  {
    name: "Absolute workspace path",
    text: "Working in /Users/alfie/.openclaw/workspace today.",
    severity: "block",
    category: "file_refs",
    ruleId: "file_refs.workspace_path",
  },
  {
    name: "deeply nested workspace path",
    text: "The file is at /Users/blake/.openclaw/workspace/memory/clients.md.",
    severity: "block",
    category: "file_refs",
  },

  // -- 33-38: Cross-client refs (current scope: Convo) --------------------
  {
    name: "Convo channel leaks C2U context",
    text: "We're juggling C2U analytics work today as well.",
    severity: "block",
    category: "cross_client",
    currentClient: "Convo",
  },
  {
    name: "Convo channel leaks Randwick context",
    text: "Also dealing with Randwick Electrical SEO this afternoon.",
    severity: "block",
    category: "cross_client",
    currentClient: "Convo",
  },
  {
    name: "Convo channel leaks Aviiana context",
    text: "Aviiana database build is the priority after lunch.",
    severity: "block",
    category: "cross_client",
    currentClient: "Convo",
  },
  {
    name: "C2U channel leaks Krush context",
    text: "Same pattern we used for Krush Organics last month.",
    severity: "block",
    category: "cross_client",
    currentClient: "C2U",
  },
  {
    name: "GL channel leaks Marque strategy",
    text: "Like we discussed with Marque last week.",
    severity: "block",
    category: "cross_client",
    currentClient: "GL",
  },
  {
    name: "Generic context leaks EHS",
    text: "We saw the same issue at Enrich Home Supports.",
    severity: "block",
    category: "cross_client",
    currentClient: "C2U",
  },

  // -- 39-43: Platform IDs ------------------------------------------------
  {
    name: "Slack user ID Blake",
    text: "Blake is U0AT51640MS so pinging him directly.",
    severity: "block",
    category: "platform_ids",
    ruleId: "platform_ids.slack_user",
  },
  {
    name: "Slack channel ID",
    text: "Posted to C09ABCDE123 earlier today.",
    severity: "block",
    category: "platform_ids",
    ruleId: "platform_ids.slack_channel",
  },
  {
    name: "Slack team ID",
    text: "Team workspace is T012ABCDEF.",
    severity: "block",
    category: "platform_ids",
    ruleId: "platform_ids.slack_team",
  },
  {
    name: "Telegram chat id in context",
    text: "Telegram chat: -1001234567890 for the group.",
    severity: "block",
    category: "platform_ids",
    ruleId: "platform_ids.telegram_id_in_context",
  },
  {
    name: "Discord guild ID in context",
    text: "Guild: 123456789012345678 — that's the dev server.",
    severity: "block",
    category: "platform_ids",
    ruleId: "platform_ids.discord_snowflake_in_context",
  },

  // -- 44-49: Side-channel disclosures ------------------------------------
  {
    name: "DM-ing Blake announcement",
    text: "DM-ing Blake about the Cam thread now.",
    severity: "block",
    category: "side_channel",
    ruleId: "side_channel.dming_someone",
  },
  {
    name: "I told Blake separately",
    text: "I told Blake about that pricing question yesterday.",
    severity: "block",
    category: "side_channel",
    ruleId: "side_channel.told_person",
  },
  {
    name: "writing to daily note",
    text: "Writing this to the daily note so we don't lose it.",
    severity: "block",
    category: "side_channel",
    ruleId: "side_channel.writing_to_note",
  },
  {
    name: "logging to memory",
    text: "Logging this to memory for the next session.",
    severity: "block",
    category: "side_channel",
    ruleId: "side_channel.logging_to_memory",
  },
  {
    name: "note to Blake",
    text: "Note to Blake: this needs a second pass before client review.",
    severity: "block",
    category: "side_channel",
    ruleId: "side_channel.note_to_self",
  },
  {
    name: "flagging to Blake directly",
    text: "Flagging this to Blake directly via DM.",
    severity: "block",
    category: "side_channel",
    ruleId: "side_channel.flagging_to",
  },

  // -- 50-52: Thinking tags ----------------------------------------------
  {
    name: "literal <thinking> open",
    text: "Here's the answer: <thinking>but first let me reason</thinking> done.",
    severity: "block",
    category: "thinking_tags",
    ruleId: "thinking_tags.open",
  },
  {
    name: "literal </thinking> close only",
    text: "Stray close tag </thinking> in the output.",
    severity: "block",
    category: "thinking_tags",
    ruleId: "thinking_tags.close",
  },
  {
    name: "uppercase <THINKING>",
    text: "Some output had <THINKING> blocks streamed.",
    severity: "block",
    category: "thinking_tags",
  },

  // -- 53-58: Debugging narration ----------------------------------------
  {
    name: "spawning a subagent",
    text: "Spawning a subagent for the bulk rewrite.",
    severity: "warn",
    category: "debugging_narration",
    ruleId: "debugging_narration.spawning",
  },
  {
    name: "tool calls phrasing",
    text: "Will need ~10 tool calls to get the answer.",
    severity: "warn",
    category: "debugging_narration",
    ruleId: "debugging_narration.tool_call",
  },
  {
    name: "API call narration",
    text: "That's three API calls to GSC for one page.",
    severity: "warn",
    category: "debugging_narration",
    ruleId: "debugging_narration.api_call",
  },
  {
    name: "tokens burned",
    text: "We burned 30k tokens on the wrong path.",
    severity: "warn",
    category: "debugging_narration",
    ruleId: "debugging_narration.token_runtime",
  },
  {
    name: "context window narration",
    text: "Approaching the context window limit; should reset.",
    severity: "warn",
    category: "debugging_narration",
    ruleId: "debugging_narration.context_window",
  },
  {
    name: "compaction narration",
    text: "Need a fresh session before this hits compaction.",
    severity: "warn",
    category: "debugging_narration",
    ruleId: "debugging_narration.compaction",
  },

  // -- 59-60: Multi-violation real-world cases ---------------------------
  {
    name: "7 May breach replica — multi-category",
    text: "Let me check the C2U board. Now I'll spawn a SONNET subagent. Logging this to memory. Blake is U0AT51640MS.",
    severity: "block",
    // Multi-category leak; anchor on side_channel because the "logging this
    // to memory" phrasing is the load-bearing post-7 May target.
    category: "side_channel",
  },
  {
    name: "diary message anti-pattern",
    text: "Got it — let me see. <thinking>OK so first I'll check ~/.openclaw/workspace/memory/clients.md</thinking>",
    severity: "block",
    category: "thinking_tags",
  },
];

describe("Stage B — known-leak corpus (50+ patterns)", () => {
  it("has at least 50 cases", () => {
    expect(LEAKS.length).toBeGreaterThanOrEqual(50);
  });

  for (const c of LEAKS) {
    it(`leak: ${c.name}`, () => {
      const result = evaluate(c.text, c.currentClient ? { currentClient: c.currentClient } : {});
      expect(result.severity, `expected severity=${c.severity} for "${c.name}"`).toBe(c.severity);
      expect(result.violations.length, `expected ≥1 violation for "${c.name}"`).toBeGreaterThan(0);
      // At least one violation must match the expected category.
      const matchedCategories = result.violations.map((v) => v.category);
      expect(matchedCategories, `expected category ${c.category}`).toContain(c.category);
      if (c.ruleId) {
        const matchedRules = result.violations.map((v) => v.ruleId);
        expect(matchedRules, `expected ruleId ${c.ruleId}`).toContain(c.ruleId);
      }
      // `blocked` MUST mirror severity===block.
      expect(result.blocked).toBe(c.severity === "block");
    });
  }
});
