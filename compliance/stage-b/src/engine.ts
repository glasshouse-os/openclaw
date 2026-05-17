/**
 * Stage B — Regex Leak Filter — Engine
 *
 * Pure-function regex evaluator. No I/O at evaluation time, no LLM calls,
 * no network. Patterns are loaded once at module import; the cross-client
 * subset is built dynamically from `config/known-clients.json` and any
 * `extraKnownClients` passed in at evaluate time.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_PATTERNS } from "./patterns.js";
import type {
  EvaluateOptions,
  EvaluationResult,
  LeakCategory,
  PatternRule,
  Severity,
  Violation,
} from "./types.js";

export const ENGINE_VERSION = "0.1.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------------------------------------------------------------------------
// Known-client registry
// ----------------------------------------------------------------------------
interface KnownClientsConfig {
  /**
   * The list of known clients. Each entry is the canonical name; aliases
   * are listed in `aliases`. The engine builds a single regex per client
   * that matches the canonical name OR any alias as a whole word.
   */
  clients: Array<{
    name: string;
    aliases?: string[];
    /** If true, matching is case-sensitive (use for short acronyms like "GL"
     *  that would over-match against the English word "GL" rarely or against
     *  initialisms used in regulated contexts). Defaults to false. */
    caseSensitive?: boolean;
  }>;
}

function loadKnownClients(): KnownClientsConfig {
  const path = join(__dirname, "..", "config", "known-clients.json");
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as KnownClientsConfig;
}

// Cached at module load.
const KNOWN_CLIENTS_CONFIG = loadKnownClients();

/**
 * Normalise a client name for case-insensitive matching against
 * `currentClient`. We compare lowercased + stripped of common separators.
 */
function normaliseClientKey(name: string): string {
  return name.toLowerCase().replace(/[\s_\-]+/g, "");
}

/**
 * Build cross-client rules dynamically. For each known client OTHER than
 * `currentClient`, generate one rule that matches the canonical name or
 * any alias as a whole word.
 *
 * Splitting into one rule per client (vs one big alternation) yields
 * better violation messages — the report names the specific client whose
 * scope was breached.
 */
function buildCrossClientRules(
  currentClient: string | undefined,
  extraKnownClients: string[] | undefined,
): PatternRule[] {
  const current = currentClient ? normaliseClientKey(currentClient) : undefined;
  const configured = KNOWN_CLIENTS_CONFIG.clients.map((c) => ({
    name: c.name,
    aliases: c.aliases ?? [],
    caseSensitive: c.caseSensitive ?? false,
  }));

  // Extra clients are added as case-insensitive, no aliases.
  const extras = (extraKnownClients ?? []).map((name) => ({
    name,
    aliases: [] as string[],
    caseSensitive: false,
  }));

  const rules: PatternRule[] = [];
  for (const client of [...configured, ...extras]) {
    if (current && normaliseClientKey(client.name) === current) continue;
    if (current && client.aliases.some((a) => normaliseClientKey(a) === current)) {
      continue;
    }
    const tokens = [client.name, ...client.aliases].map(escapeRegex);
    // Use lookarounds for "whole word" since some client names contain
    // non-word characters (e.g. "Co-Group").
    const body = `(?<![A-Za-z0-9])(?:${tokens.join("|")})(?![A-Za-z0-9])`;
    rules.push({
      id: `cross_client.${slug(client.name)}`,
      category: "cross_client",
      severity: "block",
      pattern: body,
      caseSensitive: client.caseSensitive,
      description: `Cross-client mention: "${client.name}" (current scope: ${currentClient ?? "<none>"}).`,
    });
  }
  return rules;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ----------------------------------------------------------------------------
// Compilation
// ----------------------------------------------------------------------------
interface CompiledRule {
  rule: PatternRule;
  regex: RegExp;
}

const COMPILED_BASE: CompiledRule[] = ALL_PATTERNS.map(compileRule);

function compileRule(rule: PatternRule): CompiledRule {
  const flags = rule.caseSensitive ? "gm" : "gim";
  let regex: RegExp;
  try {
    regex = new RegExp(rule.pattern, flags);
  } catch (err) {
    throw new Error(`Stage B: failed to compile rule "${rule.id}": ${(err as Error).message}`);
  }
  return { rule, regex };
}

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

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
/**
 * Evaluate a string against the Stage B regex suite. Pure function.
 *
 * @param text  The candidate outbound message body.
 * @param options Optional client scope + escape hatches.
 */
export function evaluate(text: string, options: EvaluateOptions = {}): EvaluationResult {
  const skip = new Set(options.skipCategories ?? []);

  const dynamicRules = skip.has("cross_client")
    ? []
    : buildCrossClientRules(options.currentClient, options.extraKnownClients).map(compileRule);

  const compiled: CompiledRule[] = [
    ...COMPILED_BASE.filter(({ rule }) => !skip.has(rule.category)),
    ...dynamicRules,
  ];

  const lineStarts = buildLineIndex(text);
  const violations: Violation[] = [];

  for (const { rule, regex } of compiled) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      // Zero-width safety: bump lastIndex if the match consumed no chars.
      if (m[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      const { line, column } = offsetToLineCol(m.index, lineStarts);
      violations.push({
        category: rule.category,
        ruleId: rule.id,
        severity: rule.severity,
        match: truncate(m[0], 200),
        line,
        column,
        description: rule.description,
      });
    }
  }

  // Sort: block-severity first, then by line, then by column. Stable for
  // deterministic test output.
  violations.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "block" ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });

  const summary = emptyCategoryCounts();
  for (const v of violations) summary[v.category]++;

  const severity = computeOverallSeverity(violations);

  return {
    blocked: severity === "block",
    severity,
    violations,
    summary,
    evaluatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

function emptyCategoryCounts(): Record<LeakCategory, number> {
  return {
    internal_monologue: 0,
    tool_refs: 0,
    model_refs: 0,
    file_refs: 0,
    cross_client: 0,
    platform_ids: 0,
    side_channel: 0,
    thinking_tags: 0,
    debugging_narration: 0,
  };
}

function computeOverallSeverity(violations: Violation[]): Severity {
  if (violations.length === 0) return "clean";
  return violations.some((v) => v.severity === "block") ? "block" : "warn";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/**
 * Convenience: synchronous boolean shortcut. `true` if the message would
 * be blocked.
 */
export function isBlocked(text: string, options: EvaluateOptions = {}): boolean {
  return evaluate(text, options).blocked;
}

/**
 * Test/debug helper: list every loaded rule, including dynamic
 * cross-client rules for the given `currentClient`.
 */
export function listRules(options: EvaluateOptions = {}): PatternRule[] {
  return [
    ...ALL_PATTERNS,
    ...buildCrossClientRules(options.currentClient, options.extraKnownClients),
  ];
}
