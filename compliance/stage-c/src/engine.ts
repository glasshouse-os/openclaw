/**
 * Stage C — Regex Policy Validators — Engine
 *
 * Pure-function regex evaluator. No I/O at evaluation time, no LLM
 * calls, no network. Patterns are compiled once at module import.
 *
 * The output shape mirrors Stage B's `EvaluationResult` so that the
 * Stage A pipeline driver can consume both with the same surface.
 * Differences:
 *   - Every Stage C violation is `block` severity (Stage C is the
 *     hardblock layer; no `warn`).
 *   - Violations carry `reasoning` (human + machine readable
 *     explanation with TGA clause / Schedule reference).
 *   - `audienceContext` controls C.1 skip (HCP exception).
 */

import { ALL_PATTERNS, C1_CATEGORIES } from "./patterns.js";
import type {
  PolicyCategory,
  PolicyResult,
  PolicyRule,
  PolicyViolation,
  ValidatePolicyInput,
} from "./types.js";

export const ENGINE_VERSION = "0.1.0";

// ----------------------------------------------------------------------------
// Compilation
// ----------------------------------------------------------------------------
interface CompiledRule {
  rule: PolicyRule;
  regex: RegExp;
}

function compileRule(rule: PolicyRule): CompiledRule {
  // Stage C is always case-insensitive — drug brand names appear in
  // every case combination in real copy.
  const flags = "gim";
  let regex: RegExp;
  try {
    regex = new RegExp(rule.pattern, flags);
  } catch (err) {
    throw new Error(`Stage C: failed to compile rule "${rule.id}": ${(err as Error).message}`);
  }
  return { rule, regex };
}

const COMPILED: CompiledRule[] = ALL_PATTERNS.map(compileRule);

// ----------------------------------------------------------------------------
// Position helpers
// ----------------------------------------------------------------------------
function buildLineIndex(text: string): number[] {
  // Index[i] = absolute offset where line i+1 starts (1-indexed lines).
  const offsets: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) offsets.push(i + 1);
  }
  return offsets;
}

function offsetToLineCol(offset: number, lineStarts: number[]): { line: number; column: number } {
  // Binary search for the greatest line-start <= offset.
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lineStarts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  const line = lo + 1; // 1-indexed
  const column = offset - lineStarts[lo]! + 1;
  return { line, column };
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

// ----------------------------------------------------------------------------
// Reasoning builder
// ----------------------------------------------------------------------------
/**
 * Build the `reasoning` string for one violation. The string is the
 * cited authority + the rule description + a short remediation hint.
 * Keep it short — audit-log UI surfaces these inline.
 */
function buildReasoning(rule: PolicyRule, match: string): string {
  const remediation = remediationFor(rule.category);
  return `${rule.description} Match: "${truncate(match, 80)}". Authority: ${rule.source} ${remediation}`.trim();
}

function remediationFor(category: PolicyCategory): string {
  switch (category) {
    case "schedule_4":
      return "Remediation: remove the prescription-only drug name; reframe in non-product terms or route via HCP-audience pipeline.";
    case "schedule_8":
      return "Remediation: remove the controlled-drug name; consumer-facing mention is prohibited under TG Act s.42DLB.";
    case "prohibited_cancer":
    case "prohibited_sti":
    case "prohibited_hiv":
    case "prohibited_hcv":
    case "prohibited_tuberculosis":
      return "Remediation: remove the therapeutic claim. These conditions cannot appear in advertising of therapeutic goods (TGA Code 2021 Part 2).";
    case "prohibited_mental_illness":
      return "Remediation: remove the disease-state cure/treat claim. Mental-illness representations are restricted under TGA Code 2021 s.7 — Delegate approval required (assume not granted).";
    case "prohibited_abortifacient":
      return "Remediation: remove the abortifacient claim. Prohibited under TGA Code 2021 s.6(2)(e).";
    case "prohibited_schedule_9":
      return "Remediation: remove the therapeutic claim involving the Schedule 9 substance. Even research framing must route through Stage C.3 (semantic claim layer).";
  }
}

// ----------------------------------------------------------------------------
// Sort key
// ----------------------------------------------------------------------------
/**
 * Deterministic ordering of category names for stable sorting. Keeping
 * this explicit (rather than alphabetical) means the audit log groups
 * violations by their pipeline category, with C.1 (drug-name) before
 * C.2 (prohibited representation).
 */
const CATEGORY_ORDER: Record<PolicyCategory, number> = {
  schedule_4: 0,
  schedule_8: 1,
  prohibited_cancer: 2,
  prohibited_sti: 3,
  prohibited_hiv: 4,
  prohibited_hcv: 5,
  prohibited_mental_illness: 6,
  prohibited_abortifacient: 7,
  prohibited_tuberculosis: 8,
  prohibited_schedule_9: 9,
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
/**
 * Validate a candidate outbound text against Stage C.1/C.2 policies.
 * Pure function. Always returns; never throws.
 *
 * @param input  Text + options.
 */
export function validatePolicy(input: ValidatePolicyInput): PolicyResult {
  const { text, options } = input;
  const skip = new Set<PolicyCategory>(options?.skipCategories ?? []);
  const audience = options?.audienceContext ?? "consumer";

  // HCP audience exempts C.1 (Schedule 4/8 mentions). C.2 (prohibited
  // representations) is NEVER skipped — those rules apply to all
  // audiences under TGA Code Part 2.
  const skipC1 = audience === "hcp";

  const lineStarts = buildLineIndex(text);
  const violations: PolicyViolation[] = [];

  for (const { rule, regex } of COMPILED) {
    if (skip.has(rule.category)) continue;
    if (skipC1 && (C1_CATEGORIES as ReadonlyArray<string>).includes(rule.category)) {
      continue;
    }

    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      // Zero-width safety: bump lastIndex if the match consumed no chars.
      if (m[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      const { line, column } = offsetToLineCol(m.index, lineStarts);
      const matchText = truncate(m[0], 200);
      violations.push({
        category: rule.category,
        rule: rule.id,
        severity: "block",
        match: matchText,
        line,
        column,
        reasoning: buildReasoning(rule, m[0]),
      });
    }
  }

  // Stable-sort: category order, then line, then column, then rule id.
  // Rule id is the final tie-breaker so that two rules matching the same
  // span (rare but possible) produce a deterministic ordering.
  violations.sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category];
    const cb = CATEGORY_ORDER[b.category];
    if (ca !== cb) return ca - cb;
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0;
  });

  return {
    blocked: violations.length > 0,
    violations,
    summary: buildSummary(violations),
    evaluatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

function buildSummary(violations: PolicyViolation[]): string {
  if (violations.length === 0) return "clean — 0 policy violations";
  const counts: Partial<Record<PolicyCategory, number>> = {};
  for (const v of violations) {
    counts[v.category] = (counts[v.category] ?? 0) + 1;
  }
  const parts = (Object.entries(counts) as Array<[PolicyCategory, number]>)
    .sort((a, b) => CATEGORY_ORDER[a[0]] - CATEGORY_ORDER[b[0]])
    .map(([cat, n]) => `${n} ${cat}`);
  return `${violations.length} violation${violations.length === 1 ? "" : "s"}: ${parts.join(", ")}`;
}

/**
 * Convenience: synchronous boolean shortcut. `true` if the text would
 * be blocked under Stage C.1/C.2.
 */
export function isBlocked(text: string, options?: ValidatePolicyInput["options"]): boolean {
  return validatePolicy({ text, options }).blocked;
}

/**
 * Test/debug helper: list every loaded rule.
 */
export function listRules(): PolicyRule[] {
  return [...ALL_PATTERNS];
}
