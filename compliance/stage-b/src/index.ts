/**
 * @glasshouse/compliance-stage-b — public surface.
 *
 * Stage B is the regex leak filter for the Glasshouse OS compliance
 * pipeline. It catches the obvious failure modes — internal monologue,
 * tool/model/file references, cross-client leaks, platform IDs,
 * side-channel disclosures, `<thinking>` tags, and debugging narration —
 * before they reach an external surface (Slack, Telegram groups, Discord,
 * email, ClickUp/Linear comments, etc.).
 *
 * It is the FIRST gate in the pre-send pipeline. Stages C–G handle
 * ambiguity, policy, hallucination, and human gating respectively.
 *
 * See README.md for the full integration contract.
 */

export { evaluate, isBlocked, listRules, ENGINE_VERSION } from "./engine.js";
export {
  ALL_PATTERNS,
  INTERNAL_MONOLOGUE,
  TOOL_REFS,
  MODEL_REFS,
  FILE_REFS,
  PLATFORM_IDS,
  SIDE_CHANNEL,
  THINKING_TAGS,
  DEBUGGING_NARRATION,
} from "./patterns.js";
export type {
  EvaluateOptions,
  EvaluationResult,
  LeakCategory,
  PatternRule,
  PatternSeverity,
  Severity,
  Violation,
} from "./types.js";
