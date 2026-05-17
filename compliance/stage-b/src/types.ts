/**
 * Stage B — Regex Leak Filter — Type Contracts
 *
 * These types are the integration contract between Stage A (the pipeline
 * driver), Stage B (this module), and Stage C (the LLM-based policy
 * validator). They are intentionally narrow and serialisable so the pipeline
 * can persist violations into the immutable audit log without translation.
 *
 * See README.md → "Integration contract" for the full lifecycle.
 */

/**
 * Overall severity of a Stage B evaluation.
 *
 * - `clean`: no patterns matched.
 * - `warn`: only `warn`-level patterns matched (e.g. internal monologue,
 *   debugging narration). The caller MAY override; Stage B's recommendation
 *   is still to surface a warning, not to ship as-is.
 * - `block`: at least one `block`-level pattern matched (cross-client,
 *   model refs, file refs, thinking tags, side-channel disclosure, IDs).
 *   The message MUST NOT be sent to an external surface without explicit
 *   human override + audit entry.
 */
export type Severity = "clean" | "warn" | "block";

/**
 * Severity of an individual pattern when it matches.
 *
 * The OVERALL severity is the maximum of all matched pattern severities,
 * where block > warn > clean.
 */
export type PatternSeverity = "block" | "warn";

/**
 * The taxonomy of leak categories Stage B knows about.
 *
 * If a new category is added, update:
 *   1. `src/patterns.ts` (add patterns under the new category)
 *   2. `README.md` (document what the category covers)
 *   3. `test/` (add coverage)
 */
export type LeakCategory =
  | "internal_monologue"
  | "tool_refs"
  | "model_refs"
  | "file_refs"
  | "cross_client"
  | "platform_ids"
  | "side_channel"
  | "thinking_tags"
  | "debugging_narration";

/**
 * One regex rule. `pattern` is a JS-flavoured RegExp source; flags are
 * always `g` + case-insensitivity unless the rule opts out via
 * `caseSensitive: true` (e.g. for alias matches like `SONNET` where
 * lowercase `sonnet` in normal English would over-match).
 *
 * `id` is stable and human-readable. It SHOULD survive across versions so
 * downstream consumers (audit log queries, allow-lists, suppression rules)
 * can refer to specific rules.
 *
 * `description` is shown in violation reports and the README.
 */
export interface PatternRule {
  /** Stable identifier, e.g. `internal_monologue.let_me`. */
  id: string;
  category: LeakCategory;
  severity: PatternSeverity;
  /** RegExp source. Flags are added by the engine (always `g`, default `i`). */
  pattern: string;
  /** Set `true` to make this rule case-sensitive (rare; for alias tokens). */
  caseSensitive?: boolean;
  /** Short human description shown in violation reports. */
  description: string;
  /** Optional notes (e.g. "exempt inside ``` code fences"). Not enforced. */
  notes?: string;
}

/**
 * One concrete violation found in the input. There may be many per text.
 * `line` is 1-indexed; `column` is 1-indexed character offset within that
 * line. `match` is the literal substring that matched (truncated to 200
 * chars to keep audit logs sane).
 */
export interface Violation {
  category: LeakCategory;
  ruleId: string;
  severity: PatternSeverity;
  match: string;
  line: number;
  column: number;
  description: string;
}

/**
 * Inputs to the engine. `currentClient`, when supplied, suppresses
 * cross-client matches for that client (i.e. you can talk about C2U in a
 * C2U-scoped channel).
 *
 * `extraKnownClients` lets the caller add transient/non-config clients
 * (e.g. a brand-new client whose name isn't in `config/known-clients.json`
 * yet) without editing the config file.
 *
 * `skipCategories` is an escape hatch for tests / Stage A composition;
 * production callers SHOULD leave this empty.
 */
export interface EvaluateOptions {
  currentClient?: string;
  extraKnownClients?: string[];
  skipCategories?: LeakCategory[];
}

/**
 * Full output of one evaluation. Always returned; never thrown. Pipeline
 * code should branch on `blocked` / `severity`, not on exceptions.
 */
export interface EvaluationResult {
  /** Convenience: `severity === "block"`. */
  blocked: boolean;
  severity: Severity;
  violations: Violation[];
  /** Counts by category, for telemetry / dashboards. */
  summary: Record<LeakCategory, number>;
  /** ISO-8601 UTC timestamp the engine produced this result. */
  evaluatedAt: string;
  /** Engine semver. Bumped when patterns or output shape changes. */
  engineVersion: string;
}
