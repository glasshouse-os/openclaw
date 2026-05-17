/**
 * Stage C — Regex Policy Validators — Pattern Library
 *
 * Each rule has a stable id, a category, a severity (always `block`),
 * a regex source, a description, and an explicit `source` citing the
 * underlying authority (Poisons Standard entry or TGA Code clause).
 *
 * Flags applied by the engine: always `gi` (global + case-insensitive).
 * Drug names appear in everyday copy as "Ozempic", "ozempic", "OZEMPIC"
 * — we catch all variants.
 *
 * --- ADDING A NEW SCHEDULE 4/8 ENTRY ---
 *   1. Append a rule to SCHEDULE_4 or SCHEDULE_8 below with BOTH
 *      `\b` word boundaries.
 *   2. Cite the Poisons Standard entry in `source` (Schedule + month/year
 *      + substance class).
 *   3. Add positive AND negative tests (word-boundary guard,
 *      substring-safety guard, HCP-exemption guard).
 *
 * --- ADDING A NEW PROHIBITED REPRESENTATION ---
 *   1. Append a rule to the matching PROHIBITED_* array below.
 *   2. Cite the TGA Code clause (e.g. "TGA Code 2021 s.6(2)(a)").
 *   3. Add at least one false-positive guard test (educational /
 *      research / awareness copy must pass clean).
 *
 * --- AUTHORITIES ---
 *
 * Poisons Standard (Therapeutic Goods (Poisons Standard — February 2026)
 * Instrument) — full text:
 *   https://www.tga.gov.au/resources/publication/scheduling-decisions/poisons-standard
 *
 * Therapeutic Goods Advertising Code 2021 — full text:
 *   https://www.legislation.gov.au/F2021L01861/latest/text
 *
 * Therapeutic Goods Act 1989 — ss.42DL / 42DLB (advertising of S4/S8):
 *   https://www.legislation.gov.au/C2004A03952/latest/text
 *
 * The curated list below is the authority for v0. The Stage C.3 ticket
 * (GLA-13) wires this against a live ARTG-backed corpus.
 */

import type { PolicyRule } from "./types.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
/**
 * Build a word-boundary-anchored alternation rule for a single substance
 * with one or more name variants (generic + brand names).
 *
 * Why word boundaries instead of lookarounds? `\b` is correct here
 * because all substance names are ASCII letters with no internal
 * punctuation, and we explicitly DO want to allow "5mg Ozempic" /
 * "(Ozempic)" to match while preventing "ozempicfreezone" from matching.
 *
 * Why escape each name individually instead of joining first? Defensive:
 * future entries may contain hyphens, slashes, or parentheses that would
 * break a naive join.
 */
function nameAlt(names: string[]): string {
  return names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

// ============================================================================
// C.1 — Schedule 4 (prescription-only) substances
// ============================================================================
// Source: Poisons Standard February 2026, Schedule 4. Each entry lists
// the generic name + Australian brand names actively marketed under
// ARTG registration. Mentioning these to a consumer audience is
// prohibited advertising under Therapeutic Goods Act 1989 s.42DL.
// ----------------------------------------------------------------------------

export const SCHEDULE_4: PolicyRule[] = [
  // ---- Weight-loss / GLP-1 class (highest risk — Convo blog breach was here) ----
  {
    id: "schedule_4.semaglutide",
    category: "schedule_4",
    severity: "block",
    // Generic name + AU brand names (Ozempic = T2DM indication;
    // Wegovy = weight-management indication; Rybelsus = oral form).
    pattern: `\\b(?:${nameAlt(["semaglutide", "Ozempic", "Wegovy", "Rybelsus"])})\\b`,
    description: "Schedule 4 GLP-1 agonist (semaglutide / Ozempic / Wegovy / Rybelsus).",
    source: "Poisons Standard Feb 2026, Schedule 4 — semaglutide (TG Act s.42DL).",
  },
  {
    id: "schedule_4.tirzepatide",
    category: "schedule_4",
    severity: "block",
    // Mounjaro = T2DM; Zepbound = US weight-management brand, sometimes
    // referenced in AU compounded-supply copy and therefore in scope.
    pattern: `\\b(?:${nameAlt(["tirzepatide", "Mounjaro", "Zepbound"])})\\b`,
    description: "Schedule 4 GIP/GLP-1 dual agonist (tirzepatide / Mounjaro / Zepbound).",
    source: "Poisons Standard Feb 2026, Schedule 4 — tirzepatide (TG Act s.42DL).",
  },
  {
    id: "schedule_4.liraglutide",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["liraglutide", "Saxenda", "Victoza"])})\\b`,
    description: "Schedule 4 GLP-1 agonist (liraglutide / Saxenda / Victoza).",
    source: "Poisons Standard Feb 2026, Schedule 4 — liraglutide (TG Act s.42DL).",
  },
  {
    id: "schedule_4.dulaglutide",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["dulaglutide", "Trulicity"])})\\b`,
    description: "Schedule 4 GLP-1 agonist (dulaglutide / Trulicity).",
    source: "Poisons Standard Feb 2026, Schedule 4 — dulaglutide (TG Act s.42DL).",
  },
  {
    id: "schedule_4.phentermine",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["phentermine", "Duromine", "Metermine"])})\\b`,
    description:
      "Schedule 4 sympathomimetic appetite suppressant (phentermine / Duromine / Metermine).",
    source: "Poisons Standard Feb 2026, Schedule 4 — phentermine (TG Act s.42DL).",
  },
  {
    id: "schedule_4.naltrexone_bupropion",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:Contrave|naltrexone[\\s\\-]?bupropion|bupropion[\\s\\-]?naltrexone)\\b`,
    description: "Schedule 4 weight-loss combo (Contrave / naltrexone+bupropion).",
    source: "Poisons Standard Feb 2026, Schedule 4 — naltrexone+bupropion (TG Act s.42DL).",
  },
  {
    id: "schedule_4.orlistat_prescription",
    category: "schedule_4",
    severity: "block",
    // Xenical = the prescription-strength 120 mg orlistat. Lower-strength
    // (60 mg) orlistat OTC is Schedule 3, but Xenical-branded mentions
    // are S4 and prohibited from consumer advertising. The generic name
    // alone is ambiguous, so we only fire on the brand.
    pattern: `\\b(?:Xenical)\\b`,
    description: "Schedule 4 lipase inhibitor (Xenical — orlistat 120 mg prescription strength).",
    source: "Poisons Standard Feb 2026, Schedule 4 — orlistat 120mg (TG Act s.42DL).",
  },

  // ---- Mental health Schedule 4 (high risk — many telehealth clients) ----
  {
    id: "schedule_4.sertraline",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["sertraline", "Zoloft", "Eleva"])})\\b`,
    description: "Schedule 4 SSRI antidepressant (sertraline / Zoloft / Eleva).",
    source: "Poisons Standard Feb 2026, Schedule 4 — sertraline (TG Act s.42DL).",
  },
  {
    id: "schedule_4.escitalopram",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["escitalopram", "Lexapro", "Esipram", "Loxalate"])})\\b`,
    description: "Schedule 4 SSRI antidepressant (escitalopram / Lexapro / Esipram / Loxalate).",
    source: "Poisons Standard Feb 2026, Schedule 4 — escitalopram (TG Act s.42DL).",
  },
  {
    id: "schedule_4.fluoxetine",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["fluoxetine", "Prozac", "Lovan", "Zactin"])})\\b`,
    description: "Schedule 4 SSRI antidepressant (fluoxetine / Prozac / Lovan / Zactin).",
    source: "Poisons Standard Feb 2026, Schedule 4 — fluoxetine (TG Act s.42DL).",
  },
  {
    id: "schedule_4.citalopram",
    category: "schedule_4",
    severity: "block",
    // "Cipramil" is the AU brand; "Celapram" is a generic-brand. We do
    // NOT include the bare word "citalopram" only — we include it inside
    // the alternation. We avoid the literal token "cipram" alone because
    // it could over-match unrelated tokens.
    pattern: `\\b(?:${nameAlt(["citalopram", "Cipramil", "Celapram", "Talam"])})\\b`,
    description: "Schedule 4 SSRI antidepressant (citalopram / Cipramil / Celapram / Talam).",
    source: "Poisons Standard Feb 2026, Schedule 4 — citalopram (TG Act s.42DL).",
  },
  {
    id: "schedule_4.venlafaxine",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["venlafaxine", "Effexor", "Efexor"])})\\b`,
    description: "Schedule 4 SNRI antidepressant (venlafaxine / Effexor).",
    source: "Poisons Standard Feb 2026, Schedule 4 — venlafaxine (TG Act s.42DL).",
  },
  {
    id: "schedule_4.duloxetine",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["duloxetine", "Cymbalta", "Andepra"])})\\b`,
    description: "Schedule 4 SNRI antidepressant (duloxetine / Cymbalta / Andepra).",
    source: "Poisons Standard Feb 2026, Schedule 4 — duloxetine (TG Act s.42DL).",
  },
  {
    id: "schedule_4.mirtazapine",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["mirtazapine", "Avanza", "Mirtazon", "Remeron"])})\\b`,
    description:
      "Schedule 4 tetracyclic antidepressant (mirtazapine / Avanza / Mirtazon / Remeron).",
    source: "Poisons Standard Feb 2026, Schedule 4 — mirtazapine (TG Act s.42DL).",
  },
  {
    id: "schedule_4.bupropion",
    category: "schedule_4",
    severity: "block",
    // Naming `bupropion` alone (without the naltrexone combo) is also S4
    // when promoted as a smoking-cessation/depression aid (Zyban /
    // Wellbutrin). Contrave combo is caught separately above.
    pattern: `\\b(?:${nameAlt(["bupropion", "Zyban", "Wellbutrin"])})\\b`,
    description:
      "Schedule 4 NDRI antidepressant / smoking-cessation aid (bupropion / Zyban / Wellbutrin).",
    source: "Poisons Standard Feb 2026, Schedule 4 — bupropion (TG Act s.42DL).",
  },

  // ---- Sleep / sedation Schedule 4 ----
  {
    id: "schedule_4.zolpidem",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["zolpidem", "Stilnox", "Dormizol"])})\\b`,
    description: "Schedule 4 hypnotic (zolpidem / Stilnox / Dormizol).",
    source: "Poisons Standard Feb 2026, Schedule 4 — zolpidem (TG Act s.42DL).",
  },
  {
    id: "schedule_4.zopiclone",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["zopiclone", "Imovane", "Imrest"])})\\b`,
    description: "Schedule 4 cyclopyrrolone hypnotic (zopiclone / Imovane / Imrest).",
    source: "Poisons Standard Feb 2026, Schedule 4 — zopiclone (TG Act s.42DL).",
  },

  // ---- ED / hormone Schedule 4 ----
  {
    id: "schedule_4.sildenafil",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["sildenafil", "Viagra", "Revatio"])})\\b`,
    description: "Schedule 4 PDE5 inhibitor (sildenafil / Viagra / Revatio).",
    source: "Poisons Standard Feb 2026, Schedule 4 — sildenafil (TG Act s.42DL).",
  },
  {
    id: "schedule_4.tadalafil",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["tadalafil", "Cialis", "Adcirca"])})\\b`,
    description: "Schedule 4 PDE5 inhibitor (tadalafil / Cialis / Adcirca).",
    source: "Poisons Standard Feb 2026, Schedule 4 — tadalafil (TG Act s.42DL).",
  },
  {
    id: "schedule_4.testosterone",
    category: "schedule_4",
    severity: "block",
    // Brand names only — the bare word "testosterone" appears in
    // hormone-education contexts where naming a SUBSTANCE class is
    // arguably permissible. Naming an ARTG-registered testosterone
    // PRODUCT to a consumer is the bright-line violation we want to
    // catch. See Stage C.3 (GLA-13) for the semantic claim layer.
    pattern: `\\b(?:Sustanon|Reandron|Primoteston|AndroForte|Testogel|Testavan)\\b`,
    description:
      "Schedule 4 testosterone product (Sustanon / Reandron / Primoteston / AndroForte / Testogel / Testavan).",
    source: "Poisons Standard Feb 2026, Schedule 4 — testosterone (TG Act s.42DL).",
  },

  // ---- Other high-traffic Schedule 4 ----
  {
    id: "schedule_4.isotretinoin",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["isotretinoin", "Roaccutane", "Oratane"])})\\b`,
    description: "Schedule 4 retinoid (isotretinoin / Roaccutane / Oratane).",
    source: "Poisons Standard Feb 2026, Schedule 4 — isotretinoin (TG Act s.42DL).",
  },
  {
    id: "schedule_4.finasteride",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["finasteride", "Propecia", "Proscar"])})\\b`,
    description: "Schedule 4 5-alpha-reductase inhibitor (finasteride / Propecia / Proscar).",
    source: "Poisons Standard Feb 2026, Schedule 4 — finasteride (TG Act s.42DL).",
  },
  {
    id: "schedule_4.tretinoin_prescription",
    category: "schedule_4",
    severity: "block",
    // Tretinoin brand names where the prescription product is S4 in AU.
    // The bare word "tretinoin" alone is ambiguous because some
    // strengths are S3 / S2 in cosmeceutical use; we anchor on the
    // unambiguous prescription brands.
    pattern: `\\b(?:Retin-A|Stieva-A|ReTrieve)\\b`,
    description:
      "Schedule 4 topical retinoid (Retin-A / Stieva-A / ReTrieve — prescription tretinoin).",
    source: "Poisons Standard Feb 2026, Schedule 4 — tretinoin (TG Act s.42DL).",
  },
  {
    id: "schedule_4.prednisolone",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["prednisolone", "prednisone", "Panafcortelone", "Predsone", "Predsolone", "Sone", "Solone"])})\\b`,
    description:
      "Schedule 4 corticosteroid (prednisolone / prednisone / Panafcortelone / Predsone / Predsolone / Sone / Solone).",
    source: "Poisons Standard Feb 2026, Schedule 4 — prednisolone, prednisone (TG Act s.42DL).",
  },
];

// ============================================================================
// C.1 — Schedule 8 (controlled drugs) substances
// ============================================================================
// Source: Poisons Standard February 2026, Schedule 8. Consumer-facing
// mention is prohibited under Therapeutic Goods Act 1989 s.42DLB
// (controlled drugs). All entries here trigger mandatory human review
// at a lower volume than S4.
// ----------------------------------------------------------------------------

export const SCHEDULE_8: PolicyRule[] = [
  // ---- Opioids ----
  {
    id: "schedule_8.oxycodone",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["oxycodone", "OxyContin", "Endone", "OxyNorm", "Targin"])})\\b`,
    description: "Schedule 8 opioid (oxycodone / OxyContin / Endone / OxyNorm / Targin).",
    source: "Poisons Standard Feb 2026, Schedule 8 — oxycodone (TG Act s.42DLB).",
  },
  {
    id: "schedule_8.morphine",
    category: "schedule_8",
    severity: "block",
    // "morphine" alone catches MS Contin context; brand entries also
    // listed for explicitness in audit logs.
    pattern: `\\b(?:morphine|MS\\s+Contin|Anamorph|Ordine|Sevredol|Kapanol)\\b`,
    description:
      "Schedule 8 opioid (morphine / MS Contin / Anamorph / Ordine / Sevredol / Kapanol).",
    source: "Poisons Standard Feb 2026, Schedule 8 — morphine (TG Act s.42DLB).",
  },
  {
    id: "schedule_8.fentanyl",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["fentanyl", "Durogesic", "Denpax", "Fenpatch"])})\\b`,
    description: "Schedule 8 opioid (fentanyl / Durogesic / Denpax / Fenpatch).",
    source: "Poisons Standard Feb 2026, Schedule 8 — fentanyl (TG Act s.42DLB).",
  },

  // ---- ADHD stimulants ----
  {
    id: "schedule_8.methylphenidate",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["methylphenidate", "Ritalin", "Concerta", "Artige"])})\\b`,
    description: "Schedule 8 stimulant (methylphenidate / Ritalin / Concerta / Artige).",
    source: "Poisons Standard Feb 2026, Schedule 8 — methylphenidate (TG Act s.42DLB).",
  },
  {
    id: "schedule_8.dexamfetamine",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["dexamfetamine", "dextroamphetamine", "Aspen Dexamfetamine"])})\\b`,
    description: "Schedule 8 stimulant (dexamfetamine / dextroamphetamine).",
    source: "Poisons Standard Feb 2026, Schedule 8 — dexamfetamine (TG Act s.42DLB).",
  },
  {
    id: "schedule_8.lisdexamfetamine",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["lisdexamfetamine", "Vyvanse", "Elvanse"])})\\b`,
    description: "Schedule 8 stimulant (lisdexamfetamine / Vyvanse / Elvanse).",
    source: "Poisons Standard Feb 2026, Schedule 8 — lisdexamfetamine (TG Act s.42DLB).",
  },

  // ---- Benzodiazepines (S8 entries — note: most benzos are S4, but
  //      alprazolam is uplifted to S8 in AU since 2014, and the regex
  //      treats the canonical S8 benzo subset). Diazepam/clonazepam are
  //      S4 in AU; we keep them here because the SOURCE BRIEF listed
  //      them as "Schedule 8 controlled drugs" — we honour the brief
  //      AND clarify the schedule in the citation, with a precise
  //      Schedule-4 source for the S4 ones. ----
  {
    id: "schedule_8.alprazolam",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["alprazolam", "Xanax", "Kalma", "Alprax"])})\\b`,
    description: "Schedule 8 benzodiazepine (alprazolam / Xanax / Kalma / Alprax).",
    source:
      "Poisons Standard Feb 2026, Schedule 8 — alprazolam (uplifted from S4 in 2014; TG Act s.42DLB).",
  },
  {
    id: "schedule_4.diazepam",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["diazepam", "Valium", "Antenex", "Ducene"])})\\b`,
    description: "Schedule 4 benzodiazepine (diazepam / Valium / Antenex / Ducene).",
    source: "Poisons Standard Feb 2026, Schedule 4 — diazepam (TG Act s.42DL).",
  },
  {
    id: "schedule_4.clonazepam",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["clonazepam", "Rivotril", "Paxam"])})\\b`,
    description: "Schedule 4 benzodiazepine (clonazepam / Rivotril / Paxam).",
    source: "Poisons Standard Feb 2026, Schedule 4 — clonazepam (TG Act s.42DL).",
  },
  {
    id: "schedule_4.temazepam",
    category: "schedule_4",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["temazepam", "Normison", "Temaze", "Temtabs"])})\\b`,
    description: "Schedule 4 benzodiazepine hypnotic (temazepam / Normison / Temaze / Temtabs).",
    source: "Poisons Standard Feb 2026, Schedule 4 — temazepam (TG Act s.42DL).",
  },

  // ---- Other S8 ----
  {
    id: "schedule_8.ketamine",
    category: "schedule_8",
    severity: "block",
    pattern: `\\b(?:${nameAlt(["ketamine", "Spravato", "esketamine"])})\\b`,
    description: "Schedule 8 dissociative anaesthetic (ketamine / esketamine / Spravato).",
    source: "Poisons Standard Feb 2026, Schedule 8 — ketamine (TG Act s.42DLB).",
  },
  {
    id: "schedule_8.medicinal_cannabis",
    category: "schedule_8",
    severity: "block",
    // THC-containing cannabis products are Schedule 8 in AU. "CBD" alone
    // (with low THC) sits at S4/S3 depending on dose; we keep CBD OUT of
    // this rule and let Stage C.3 handle the semantic edge cases.
    // We catch "medicinal cannabis" and "THC" in product-context phrasing.
    pattern: `\\b(?:medicinal\\s+cannabis|medical\\s+cannabis|THC\\s+(?:oil|capsule|tincture|product|treatment))\\b`,
    description: "Schedule 8 medicinal cannabis / THC product.",
    source: "Poisons Standard Feb 2026, Schedule 8 — cannabis containing >2% THC (TG Act s.42DLB).",
  },
];

// ============================================================================
// C.2 — Prohibited representations (TGA Code 2021 Part 2)
// ============================================================================
// Source: Therapeutic Goods Advertising Code 2021, ss.6–7 (restricted +
// prohibited representations). These representations cannot appear in
// advertising of therapeutic goods regardless of schedule.
// ----------------------------------------------------------------------------

/**
 * Treatment / cure / prevention verbs. Used inside proximity patterns so
 * we catch both "cure cancer" and "cancer can be cured" without over-
 * matching neutral mentions ("cancer awareness").
 *
 * We split into:
 *   - VERB_CORE:  unambiguous treat/cure/prevent verbs.
 *   - VERB_EUPH:  euphemisms ("fights", "kills", "destroys", "ends",
 *                "beats", "eliminates", "wipes out") that in therapeutic
 *                copy mean the same thing but slip past a literal scan.
 */
const VERB_CORE =
  "(?:cure|cures|cured|curing|treat|treats|treated|treating|prevent|prevents|prevented|preventing|reverse|reverses|reversed|reversing|heal|heals|healed|healing|manage|manages|managed|managing|stop|stops|stopped|stopping|remit|remits|remitted|remitting)";

const VERB_EUPH =
  "(?:fight|fights|fought|fighting|kill|kills|killed|killing|destroy|destroys|destroyed|destroying|end|ends|ended|ending|beat|beats|beaten|beating|eliminate|eliminates|eliminated|eliminating|wipe[\\s\\-]?out|wipes[\\s\\-]?out|wiped[\\s\\-]?out|knock[\\s\\-]?out|knocks[\\s\\-]?out|defeat|defeats|defeated|defeating)";

const VERB_ANY = `(?:${VERB_CORE}|${VERB_EUPH})`;

/**
 * Past-participle verbs used in the inverse-word-order patterns —
 * "cancer can be cured / treated / prevented". A subset of VERB_CORE +
 * VERB_EUPH in their past-participle form. Kept as its own constant
 * because the inverse-order patterns intentionally only fire on
 * unambiguous result-oriented forms.
 */
const VERB_PASSIVE =
  "(?:cured|treated|prevented|reversed|healed|managed|stopped|remitted|eliminated|ended|defeated|beaten)";

/**
 * "Product framing" — phrases that mark a sentence as a product/therapy
 * claim rather than an awareness/education mention. Used as an OR-side
 * for some rules so we can catch the "our [thing] X cancer" structure
 * without requiring a literal verb.
 */
const PRODUCT_FRAME =
  "(?:our\\s+(?:product|treatment|medicine|pill|tablet|capsule|formula|therapy|program|programme|protocol|supplement)|this\\s+(?:product|treatment|medicine|pill|tablet|capsule|formula|therapy|program|programme|protocol|supplement)|the\\s+(?:product|treatment|medicine|pill|tablet|capsule|formula|therapy|program|programme|protocol|supplement))";

// ---- Cancer / neoplastic disease ----
// TGA Code 2021 s.6(2)(a) and Schedule 1 — cancer / neoplastic disease.
export const PROHIBITED_CANCER: PolicyRule[] = [
  {
    id: "prohibited_cancer.verb_then_condition",
    category: "prohibited_cancer",
    severity: "block",
    // Verb (core or euphemism) then proximity-window condition.
    // Cancer / tumo(u)r / carcinoma / leukaemia / leukemia / melanoma /
    // lymphoma / sarcoma — common neoplastic terms.
    pattern: `\\b${VERB_ANY}\\b[\\s\\S]{0,60}\\b(?:cancer|cancers|cancerous|tumou?r|tumou?rs|carcinoma|carcinomas|leuka?emia|melanoma|melanomas|lymphoma|lymphomas|sarcoma|sarcomas|neoplas(?:m|ms|tic)|malignan(?:t|cy|cies))\\b`,
    description: "Cancer / neoplastic disease treatment, cure, prevention or euphemistic claim.",
    source: "TGA Code 2021 s.6(2)(a) — prohibited representations re cancer / neoplastic disease.",
  },
  {
    id: "prohibited_cancer.condition_then_verb",
    category: "prohibited_cancer",
    severity: "block",
    // Inverse word order — "cancer can be cured", "tumours are treated".
    pattern: `\\b(?:cancer|cancers|cancerous|tumou?r|tumou?rs|carcinoma|carcinomas|leuka?emia|melanoma|melanomas|lymphoma|lymphomas|sarcoma|sarcomas|neoplas(?:m|ms|tic)|malignan(?:t|cy|cies))\\b[\\s\\S]{0,40}\\b(?:can\\s+be|may\\s+be|will\\s+be|is|are|gets?|get)\\s+${VERB_PASSIVE}\\b`,
    description: "Inverse word order: cancer / neoplastic disease + cure / treat verb.",
    source: "TGA Code 2021 s.6(2)(a) — prohibited representations re cancer / neoplastic disease.",
  },
  {
    id: "prohibited_cancer.product_frame",
    category: "prohibited_cancer",
    severity: "block",
    // "our product X cancer" / "this therapy X cancer" within proximity.
    pattern: `${PRODUCT_FRAME}\\b[\\s\\S]{0,60}\\b(?:cancer|cancers|cancerous|tumou?r|tumou?rs|carcinoma|leuka?emia|melanoma|lymphoma|sarcoma|neoplas(?:m|ms|tic)|malignan(?:t|cy|cies))\\b`,
    description: "Product framing within proximity of cancer / neoplastic disease.",
    source: "TGA Code 2021 s.6(2)(a) — prohibited representations re cancer / neoplastic disease.",
  },
];

// ---- STI / sexually transmitted infections (excluding HIV — see below) ----
// TGA Code 2021 s.6(2)(b) and Schedule 1 — venereal disease / STI.
export const PROHIBITED_STI: PolicyRule[] = [
  {
    id: "prohibited_sti.verb_then_condition",
    category: "prohibited_sti",
    severity: "block",
    pattern: `\\b${VERB_ANY}\\b[\\s\\S]{0,60}\\b(?:chlamydia|gonorrh(?:o?ea|oeae)|syphilis|herpes|genital\\s+herpes|HPV|human\\s+papilloma(?:virus)?|trichomonias?is|STIs?|STDs?|venereal\\s+disease|sexually\\s+transmitted\\s+(?:infection|disease)s?)\\b`,
    description: "STI / venereal disease treatment, cure or euphemistic claim.",
    source: "TGA Code 2021 s.6(2)(b) — prohibited representations re venereal disease.",
  },
  {
    id: "prohibited_sti.condition_then_verb",
    category: "prohibited_sti",
    severity: "block",
    pattern: `\\b(?:chlamydia|gonorrh(?:o?ea|oeae)|syphilis|herpes|genital\\s+herpes|HPV|trichomonias?is|STIs?|STDs?|venereal\\s+disease|sexually\\s+transmitted\\s+(?:infection|disease)s?)\\b[\\s\\S]{0,40}\\b(?:can\\s+be|may\\s+be|will\\s+be|is|are|gets?)\\s+${VERB_PASSIVE}\\b`,
    description: "Inverse word order: STI + cure / treat verb.",
    source: "TGA Code 2021 s.6(2)(b) — prohibited representations re venereal disease.",
  },
];

// ---- HIV / AIDS ----
// TGA Code 2021 s.6(2)(c) and Schedule 1 — HIV / AIDS.
export const PROHIBITED_HIV: PolicyRule[] = [
  {
    id: "prohibited_hiv.verb_then_condition",
    category: "prohibited_hiv",
    severity: "block",
    // "HIV" appears in news context too; we require a verb or product
    // frame to fire. Bare "HIV awareness" must not match.
    pattern: `\\b${VERB_ANY}\\b[\\s\\S]{0,60}\\b(?:HIV(?:[\\s\\-]?AIDS)?|AIDS|acquired\\s+immune\\s+deficiency)\\b`,
    description: "HIV / AIDS treatment, cure, prevention or euphemistic claim.",
    source: "TGA Code 2021 s.6(2)(c) — prohibited representations re HIV / AIDS.",
  },
  {
    id: "prohibited_hiv.condition_then_verb",
    category: "prohibited_hiv",
    severity: "block",
    pattern: `\\b(?:HIV(?:[\\s\\-]?AIDS)?|AIDS|acquired\\s+immune\\s+deficiency)\\b[\\s\\S]{0,40}\\b(?:can\\s+be|may\\s+be|will\\s+be|is|are|gets?)\\s+${VERB_PASSIVE}\\b`,
    description: "Inverse word order: HIV / AIDS + cure / treat verb.",
    source: "TGA Code 2021 s.6(2)(c) — prohibited representations re HIV / AIDS.",
  },
  {
    id: "prohibited_hiv.product_frame",
    category: "prohibited_hiv",
    severity: "block",
    pattern: `${PRODUCT_FRAME}\\b[\\s\\S]{0,60}\\b(?:HIV|AIDS)\\b`,
    description: "Product framing within proximity of HIV / AIDS.",
    source: "TGA Code 2021 s.6(2)(c) — prohibited representations re HIV / AIDS.",
  },
];

// ---- Hepatitis C / HCV ----
// TGA Code 2021 s.6(2)(d) and Schedule 1 — hepatitis C.
export const PROHIBITED_HCV: PolicyRule[] = [
  {
    id: "prohibited_hcv.verb_then_condition",
    category: "prohibited_hcv",
    severity: "block",
    pattern: `\\b${VERB_ANY}\\b[\\s\\S]{0,60}\\b(?:hepatitis\\s*C|hep\\s*C|HCV)\\b`,
    description: "Hepatitis C / HCV treatment, cure or euphemistic claim.",
    source: "TGA Code 2021 s.6(2)(d) — prohibited representations re hepatitis C.",
  },
  {
    id: "prohibited_hcv.condition_then_verb",
    category: "prohibited_hcv",
    severity: "block",
    pattern: `\\b(?:hepatitis\\s*C|hep\\s*C|HCV)\\b[\\s\\S]{0,40}\\b(?:can\\s+be|may\\s+be|will\\s+be|is|are)\\s+${VERB_PASSIVE}\\b`,
    description: "Inverse word order: hepatitis C / HCV + cure / treat verb.",
    source: "TGA Code 2021 s.6(2)(d) — prohibited representations re hepatitis C.",
  },
];

// ---- Mental illness (disease-state treatment claims) ----
// TGA Code 2021 s.7 (restricted representations re mental illness).
// Note: this is `restricted`, not `prohibited`, in the Code — but
// without TGA Delegate written approval it functions as a hardblock
// for our pipeline, so we treat it as `block` here.
export const PROHIBITED_MENTAL_ILLNESS: PolicyRule[] = [
  {
    id: "prohibited_mental_illness.verb_then_condition",
    category: "prohibited_mental_illness",
    severity: "block",
    // Restricted to product-claim verbs only — "cure" / "treat" / "end".
    // Bare "improves mood" is OUT OF SCOPE here (Stage C.3 — semantic
    // therapeutic-claim layer) because it's a softer claim adjacent to
    // many legal complementary-medicine listings.
    pattern: `\\b(?:cure|cures|cured|curing|treat|treats|treated|treating|end|ends|ended|ending|reverse|reverses|reversed|reversing|eliminate|eliminates|eliminated|eliminating|stop|stops|stopped|stopping)\\b[\\s\\S]{0,60}\\b(?:depression|major\\s+depressive\\s+disorder|MDD|anxiety\\s+disorder|generalised\\s+anxiety|GAD|schizophrenia|schizophrenic|bipolar(?:\\s+disorder)?|PTSD|post[\\s\\-]?traumatic\\s+stress|OCD|obsessive[\\s\\-]?compulsive|psychosis|psychotic\\s+disorder|mental\\s+illness)\\b`,
    description: "Mental-illness disease-state treatment / cure claim.",
    source:
      "TGA Code 2021 s.7 — restricted representations re mental illness (no Delegate approval = block).",
  },
  {
    id: "prohibited_mental_illness.condition_then_verb",
    category: "prohibited_mental_illness",
    severity: "block",
    pattern: `\\b(?:depression|major\\s+depressive\\s+disorder|MDD|anxiety\\s+disorder|generalised\\s+anxiety|GAD|schizophrenia|bipolar(?:\\s+disorder)?|PTSD|post[\\s\\-]?traumatic\\s+stress|OCD|obsessive[\\s\\-]?compulsive|psychosis|psychotic\\s+disorder|mental\\s+illness)\\b[\\s\\S]{0,40}\\b(?:can\\s+be|may\\s+be|will\\s+be|is|are|gets?)\\s+${VERB_PASSIVE}\\b`,
    description: "Inverse word order: mental-illness + cure / treat verb.",
    source:
      "TGA Code 2021 s.7 — restricted representations re mental illness (no Delegate approval = block).",
  },
];

// ---- Abortifacient claims ----
// TGA Code 2021 s.6(2)(e) and Schedule 1 — abortion-inducing claims.
export const PROHIBITED_ABORTIFACIENT: PolicyRule[] = [
  {
    id: "prohibited_abortifacient.direct",
    category: "prohibited_abortifacient",
    severity: "block",
    // Direct claim of inducing abortion / terminating pregnancy.
    pattern: `\\b(?:induce|induces|induced|inducing|cause|causes|caused|causing|trigger|triggers|triggered|triggering|bring(?:s)?\\s+on|brings\\s+about)\\b[\\s\\S]{0,40}\\babortion\\b|\\b(?:terminate|terminates|terminated|terminating|end|ends|ended|ending)\\b[\\s\\S]{0,40}\\b(?:pregnancy|pregnancies)\\b|\\babortifacient\\b`,
    description: "Abortifacient claim — induces abortion / terminates pregnancy.",
    source: "TGA Code 2021 s.6(2)(e) — prohibited representations re abortion.",
  },
];

// ---- Tuberculosis ----
// TGA Code 2021 s.6(2)(f) and Schedule 1 — tuberculosis.
export const PROHIBITED_TUBERCULOSIS: PolicyRule[] = [
  {
    id: "prohibited_tuberculosis.verb_then_condition",
    category: "prohibited_tuberculosis",
    severity: "block",
    pattern: `\\b${VERB_ANY}\\b[\\s\\S]{0,60}\\b(?:tuberculosis|TB)\\b`,
    description: "Tuberculosis treatment, cure or euphemistic claim.",
    source: "TGA Code 2021 s.6(2)(f) — prohibited representations re tuberculosis.",
  },
  {
    id: "prohibited_tuberculosis.condition_then_verb",
    category: "prohibited_tuberculosis",
    severity: "block",
    pattern: `\\b(?:tuberculosis|TB)\\b[\\s\\S]{0,40}\\b(?:can\\s+be|may\\s+be|will\\s+be|is|are)\\s+${VERB_PASSIVE}\\b`,
    description: "Inverse word order: tuberculosis + cure / treat verb.",
    source: "TGA Code 2021 s.6(2)(f) — prohibited representations re tuberculosis.",
  },
];

// ---- Schedule 9 prohibited substances (therapeutic claim) ----
// Source: Poisons Standard February 2026, Schedule 9 (prohibited
// substances). Any therapeutic claim about these substances is itself
// a prohibited representation, regardless of the source's legitimacy
// (e.g. clinical psilocybin trials). Stage C.3 will reason about valid
// research framing; Stage C.2 hardblocks the bald therapeutic claim.
export const PROHIBITED_SCHEDULE_9: PolicyRule[] = [
  {
    id: "prohibited_schedule_9.therapeutic_claim",
    category: "prohibited_schedule_9",
    severity: "block",
    // Therapeutic claim verb (treat/cure/heal/etc) + S9 substance.
    pattern: `\\b${VERB_ANY}\\b[\\s\\S]{0,60}\\b(?:heroin|diamorphine|LSD|lysergic|MDMA|ecstasy|psilocybin|psilocin|magic\\s+mushrooms?|DMT|N,N[\\s\\-]?dimethyltryptamine|ayahuasca|mescaline|peyote)\\b`,
    description: "Therapeutic claim involving a Schedule 9 prohibited substance.",
    source:
      "Poisons Standard Feb 2026, Schedule 9; TGA Code 2021 s.6(2) — prohibited substance therapeutic claim.",
  },
  {
    id: "prohibited_schedule_9.product_frame",
    category: "prohibited_schedule_9",
    severity: "block",
    pattern: `${PRODUCT_FRAME}\\b[\\s\\S]{0,60}\\b(?:heroin|LSD|MDMA|psilocybin|magic\\s+mushrooms?|DMT|ayahuasca|mescaline|peyote)\\b`,
    description: "Product framing within proximity of a Schedule 9 prohibited substance.",
    source:
      "Poisons Standard Feb 2026, Schedule 9; TGA Code 2021 s.6(2) — prohibited substance therapeutic claim.",
  },
];

// ============================================================================
// Aggregate
// ============================================================================
// Order matters only for tie-breaking — engine.ts re-sorts by category +
// line + column for deterministic audit logs.
export const ALL_PATTERNS: PolicyRule[] = [
  ...SCHEDULE_4,
  ...SCHEDULE_8,
  ...PROHIBITED_CANCER,
  ...PROHIBITED_STI,
  ...PROHIBITED_HIV,
  ...PROHIBITED_HCV,
  ...PROHIBITED_MENTAL_ILLNESS,
  ...PROHIBITED_ABORTIFACIENT,
  ...PROHIBITED_TUBERCULOSIS,
  ...PROHIBITED_SCHEDULE_9,
];

/**
 * Categories that constitute "C.1 — Schedule 4/8 mentions". When
 * `audienceContext === "hcp"`, the engine skips these. C.2 categories
 * are NEVER skipped.
 */
export const C1_CATEGORIES: ReadonlyArray<string> = ["schedule_4", "schedule_8"];
