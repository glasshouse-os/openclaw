/**
 * @glasshouse/compliance-stage-c — public surface.
 *
 * Stage C.1/C.2 are the regex hardblock policy validators for the
 * Glasshouse OS compliance pipeline. They run AFTER Stage B (leak
 * filter) and BEFORE Stage C.3 (LLM therapeutic-claim classifier,
 * tracked in GLA-13).
 *
 * Scope:
 *   - C.1  Schedule 4 + Schedule 8 drug-name hardblock
 *          (Therapeutic Goods Act 1989 ss.42DL / 42DLB).
 *   - C.2  Prohibited representations (TGA Code 2021 Part 2):
 *          cancer, STI, HIV/AIDS, HCV, mental illness, abortifacient,
 *          tuberculosis, Schedule 9 therapeutic claims.
 *
 * What this module does NOT do (deferred to Stage C.3 — GLA-13):
 *   - Semantic therapeutic-claim detection
 *     ("weight-loss medication that requires a prescription").
 *   - Telehealth-linkage detection
 *     ("talk to our doctor about prescription sleep treatments").
 *   - AHPRA s.133 testimonial detection for regulated practitioners.
 *   - Restricted-representation Delegate-approval lookups.
 *
 * If a check requires judgement, it belongs in Stage C.3.
 *
 * See README.md for the full integration contract.
 */

export { validatePolicy, isBlocked, listRules, ENGINE_VERSION } from "./engine.js";
export {
  ALL_PATTERNS,
  C1_CATEGORIES,
  SCHEDULE_4,
  SCHEDULE_8,
  PROHIBITED_CANCER,
  PROHIBITED_STI,
  PROHIBITED_HIV,
  PROHIBITED_HCV,
  PROHIBITED_MENTAL_ILLNESS,
  PROHIBITED_ABORTIFACIENT,
  PROHIBITED_TUBERCULOSIS,
  PROHIBITED_SCHEDULE_9,
} from "./patterns.js";
export type {
  AudienceContext,
  PolicyCategory,
  PolicyResult,
  PolicyRule,
  PolicyViolation,
  ValidatePolicyInput,
} from "./types.js";
