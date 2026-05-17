/**
 * Stage C — Regex Policy Validators — Type Contracts
 *
 * Stage C.1/C.2 are the *deterministic hardblock* slice of the Stage C
 * policy layer. They cover the failures that don't require LLM judgement:
 *
 *   - C.1  Named Schedule 4 / Schedule 8 substances aimed at consumers
 *          (TGA Act ss.42DL / 42DLB — see compliance/stage-c/README.md).
 *   - C.2  Prohibited representations under the TGA Code 2021 Part 2
 *          (cancer, STI, HIV/AIDS, HCV, mental illness as disease-state,
 *           abortifacient, tuberculosis, Schedule 9 substance claims).
 *
 * C.3 (therapeutic-claim semantics, telehealth-linkage, AHPRA s.133
 * testimonial) lives in a separate ticket (GLA-13) and uses an Opus
 * classifier with a TGA case-law corpus — it is intentionally OUT OF
 * SCOPE here. Regex must remain regex; if a check requires judgement, it
 * belongs in C.3.
 *
 * All violations from Stage C are `block` severity. Stage C is the
 * hardblock layer; severity grading lives in C.3/E.
 *
 * Output shape is intentionally narrow and serialisable so the Stage A
 * pipeline driver can persist violations into the immutable audit log
 * without translation.
 */

/**
 * The taxonomy of policy violations Stage C can raise.
 *
 * When adding a new category:
 *   1. Add patterns under it in `src/patterns.ts`.
 *   2. Document it in README.md.
 *   3. Add positive AND negative coverage in `test/`.
 *
 * `schedule_4` and `schedule_8` are split so audit logs can distinguish
 * "named a prescription-only drug" from "named a controlled drug" —
 * downstream policy may treat these differently (e.g. S8 mentions trip
 * mandatory human review at lower volumes than S4).
 */
export type PolicyCategory =
  | "schedule_4"
  | "schedule_8"
  | "prohibited_cancer"
  | "prohibited_sti"
  | "prohibited_hiv"
  | "prohibited_hcv"
  | "prohibited_mental_illness"
  | "prohibited_abortifacient"
  | "prohibited_tuberculosis"
  | "prohibited_schedule_9";

/**
 * Audience context. TGA treats consumer-facing advertising of Schedule
 * 4/8 substances as prohibited under ss.42DL/42DLB, but advertising
 * directed exclusively at health practitioners ("HCP audience") is
 * permitted under the Therapeutic Goods Advertising Code's
 * practitioner-only exceptions.
 *
 * Default is `consumer` — Stage C errs on the side of the strictest
 * interpretation. If the pipeline knows a deliverable is HCP-only
 * (e.g. a journal placement, a doctor-only newsletter), it can pass
 * `audienceContext: "hcp"` to skip C.1 entirely.
 *
 * C.2 (prohibited representations) is NEVER skipped for HCP audiences
 * — prohibited representations are prohibited full stop.
 */
export type AudienceContext = "consumer" | "hcp";

/**
 * One regex policy rule. `pattern` is a JS-flavoured RegExp source.
 * Flags applied by the engine:
 *   - always `g` (global, so we find every occurrence)
 *   - always `i` (case-insensitive — drug brand names are case-folded
 *                 in everyday copy and we should catch all variants)
 *
 * `id` is a stable, human-readable identifier. It SHOULD survive across
 * versions so audit-log queries and downstream allow-lists can refer to
 * specific rules.
 *
 * `source` cites the underlying authority (Poisons Standard / TGA Code
 * clause) so reviewers can verify why a rule exists. This is the moat —
 * see GLASSHOUSE-FORK.md and Blueprint §8.3.
 */
export interface PolicyRule {
  /** Stable identifier, e.g. `schedule_4.semaglutide`. */
  id: string;
  category: PolicyCategory;
  /** All Stage C violations are `block`. Field is kept for parity with
   *  Stage B's shape and for future-proofing. */
  severity: "block";
  /** RegExp source. Flags are added by the engine (always `gi`). */
  pattern: string;
  /** Short human description shown in violation reports. */
  description: string;
  /** Cited authority (e.g. "Poisons Standard Feb 2026, Schedule 4 —
   *  semaglutide" or "TGA Code 2021 s.6(2)(a) — cancer"). Required:
   *  every Stage C rule must have a source. */
  source: string;
}

/**
 * One concrete policy violation found in the input. There may be many
 * per text. `line` is 1-indexed; `column` is 1-indexed character offset
 * within that line. `match` is the literal substring that matched
 * (truncated to 200 chars to keep audit logs sane).
 *
 * `reasoning` is the human-readable explanation, including the TGA
 * clause / Schedule reference, suitable for the audit-log UI and for
 * Stage E (clean-context reviewer) to consume.
 */
export interface PolicyViolation {
  category: PolicyCategory;
  rule: string;
  severity: "block";
  match: string;
  line: number;
  column: number;
  reasoning: string;
}

/**
 * Inputs to the engine.
 */
export interface ValidatePolicyInput {
  text: string;
  options?: {
    /** Disable specific categories (escape hatch for tests / Stage A
     *  composition). Production callers SHOULD leave this empty. */
    skipCategories?: PolicyCategory[];
    /** Defaults to "consumer". If "hcp", C.1 (Schedule 4/8 mentions) is
     *  skipped — practitioner-only advertising is permitted under the
     *  TGA Code's HCP exceptions. C.2 still runs. */
    audienceContext?: AudienceContext;
  };
}

/**
 * Full output of one validation. Always returned; never thrown. Pipeline
 * code should branch on `blocked`, not on exceptions.
 *
 * `summary` is a short human-readable string suitable for surfacing in
 * the audit UI when a deliverable is rejected.
 */
export interface PolicyResult {
  /** Convenience: `violations.length > 0`. All Stage C violations are
   *  `block` severity, so any violation means blocked. */
  blocked: boolean;
  violations: PolicyViolation[];
  /** Short human-readable summary, e.g. "2 violations: 1 schedule_4,
   *  1 prohibited_cancer". */
  summary: string;
  /** ISO-8601 UTC timestamp the engine produced this result. */
  evaluatedAt: string;
  /** Engine semver. Bumped when patterns or output shape changes. */
  engineVersion: string;
}
