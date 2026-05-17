/**
 * Stage C.1 — Schedule 4 / Schedule 8 drug-name positive + negative corpus.
 *
 * These tests are the BRIGHT-LINE proofs that the curated drug-name list
 * actually catches the failure modes we care about (and ONLY those — no
 * substring false positives, no word-fragment misfires, no dose-string
 * leaks).
 *
 * If you add a substance to `patterns.ts`, add a positive AND negative
 * test here.
 */

import { describe, expect, it } from "vitest";
import { validatePolicy } from "../src/engine.js";

function expectBlocked(text: string, rule?: string): void {
  const r = validatePolicy({ text });
  expect(r.blocked, `expected BLOCK for: "${text}"`).toBe(true);
  if (rule) {
    expect(
      r.violations.some((v) => v.rule === rule),
      `expected rule "${rule}" to fire for: "${text}"`,
    ).toBe(true);
  }
}

function expectClean(text: string): void {
  const r = validatePolicy({ text });
  expect(r.blocked, `expected CLEAN for: "${text}" — got: ${r.summary}`).toBe(false);
}

// ============================================================================
// C.1 — Schedule 4 (positive cases — must BLOCK)
// ============================================================================
describe("Stage C.1 — Schedule 4 positive cases (consumer audience)", () => {
  // ---- Weight-loss / GLP-1 ----
  it("blocks Ozempic mentioned in consumer copy", () =>
    expectBlocked("Get Ozempic prescribed online.", "schedule_4.semaglutide"));
  it("blocks the generic semaglutide", () =>
    expectBlocked("semaglutide weight loss program available now."));
  it("blocks Wegovy", () => expectBlocked("Ask about Wegovy at your next consult."));
  it("blocks Rybelsus", () => expectBlocked("We can supply Rybelsus tablets."));
  it("blocks Mounjaro", () => expectBlocked("Mounjaro for weight loss results."));
  it("blocks tirzepatide", () => expectBlocked("New tirzepatide programs."));
  it("blocks Zepbound", () => expectBlocked("US-brand Zepbound also available."));
  it("blocks Saxenda", () => expectBlocked("Saxenda injection program."));
  it("blocks Victoza", () => expectBlocked("Victoza available."));
  it("blocks liraglutide", () => expectBlocked("liraglutide injections."));
  it("blocks dulaglutide", () => expectBlocked("dulaglutide weekly dose."));
  it("blocks Trulicity", () => expectBlocked("Trulicity is one option."));
  it("blocks phentermine", () => expectBlocked("phentermine appetite suppressant."));
  it("blocks Duromine", () => expectBlocked("Duromine capsules in stock."));
  it("blocks Contrave", () => expectBlocked("Contrave combination therapy."));
  it("blocks Xenical", () => expectBlocked("Xenical 120mg available with script."));

  // ---- Mental health ----
  it("blocks Zoloft", () => expectBlocked("Zoloft prescribed for adults."));
  it("blocks sertraline", () => expectBlocked("sertraline 50mg taper."));
  it("blocks Lexapro", () => expectBlocked("Lexapro 10mg starting dose."));
  it("blocks escitalopram", () => expectBlocked("escitalopram is a common SSRI."));
  it("blocks Prozac", () => expectBlocked("Prozac for adults online."));
  it("blocks fluoxetine", () => expectBlocked("fluoxetine 20mg capsules."));
  it("blocks Cipramil", () => expectBlocked("Cipramil tablets in our formulary."));
  it("blocks Effexor", () => expectBlocked("Effexor XR available."));
  it("blocks Cymbalta", () => expectBlocked("Cymbalta capsules."));
  it("blocks Avanza", () => expectBlocked("Avanza Soltab tablets."));
  it("blocks Wellbutrin", () => expectBlocked("Wellbutrin XL prescribed."));

  // ---- Sleep / sedation ----
  it("blocks Stilnox", () => expectBlocked("Stilnox 10mg available."));
  it("blocks zolpidem", () => expectBlocked("zolpidem nightly dose."));
  it("blocks Imovane", () => expectBlocked("Imovane sleep aid."));
  it("blocks Normison", () => expectBlocked("Normison tablets."));
  it("blocks temazepam", () => expectBlocked("temazepam 10mg available."));

  // ---- ED / hormone ----
  it("blocks Viagra", () => expectBlocked("Get Viagra prescribed today."));
  it("blocks sildenafil", () => expectBlocked("sildenafil 50mg tablets."));
  it("blocks Cialis", () => expectBlocked("Cialis daily 5mg."));
  it("blocks tadalafil", () => expectBlocked("tadalafil daily."));
  it("blocks Sustanon", () => expectBlocked("Sustanon 250 injections."));
  it("blocks Reandron", () => expectBlocked("Reandron 1000 every 12 weeks."));
  it("blocks Testogel", () => expectBlocked("Testogel sachets supplied."));

  // ---- Other ----
  it("blocks Roaccutane", () => expectBlocked("we prescribe Roaccutane."));
  it("blocks isotretinoin", () => expectBlocked("isotretinoin acne program."));
  it("blocks Propecia", () => expectBlocked("Propecia 1mg tablets."));
  it("blocks finasteride", () => expectBlocked("finasteride hair program."));
  it("blocks Retin-A", () => expectBlocked("Retin-A topical cream available."));
  it("blocks prednisolone", () => expectBlocked("prednisolone short course prescribed."));

  // ---- Multi-word and brand fragments shouldn't break under odd casing ----
  it("blocks Ozempic with quotes and punctuation", () =>
    expectBlocked('We have "Ozempic" available now.'));
  it("blocks UPPERCASE OZEMPIC", () => expectBlocked("OZEMPIC IS HERE."));
  it("blocks lowercase ozempic", () => expectBlocked("our ozempic doctor consults are $99."));
});

// ============================================================================
// C.1 — Schedule 8 (positive cases — must BLOCK)
// ============================================================================
describe("Stage C.1 — Schedule 8 positive cases (consumer audience)", () => {
  it("blocks oxycodone", () => expectBlocked("oxycodone for chronic pain."));
  it("blocks OxyContin", () => expectBlocked("OxyContin extended release."));
  it("blocks Endone", () => expectBlocked("Endone 5mg tablets."));
  it("blocks morphine", () => expectBlocked("morphine sulfate solution."));
  it("blocks MS Contin", () => expectBlocked("MS Contin 30mg available."));
  it("blocks fentanyl", () => expectBlocked("fentanyl patches supplied."));
  it("blocks Durogesic", () => expectBlocked("Durogesic transdermal."));
  it("blocks Ritalin", () => expectBlocked("talk to our doctor about Ritalin for adult ADHD."));
  it("blocks methylphenidate", () => expectBlocked("methylphenidate XR options."));
  it("blocks Concerta", () => expectBlocked("Concerta 36mg available."));
  it("blocks dexamfetamine", () => expectBlocked("dexamfetamine for narcolepsy."));
  it("blocks Vyvanse", () => expectBlocked("talk to our doctor about Vyvanse for adult ADHD."));
  it("blocks lisdexamfetamine", () => expectBlocked("lisdexamfetamine 30mg capsules."));
  it("blocks Xanax", () => expectBlocked("Xanax 0.5mg as needed."));
  it("blocks alprazolam", () => expectBlocked("alprazolam tablets."));
  it("blocks diazepam", () => expectBlocked("diazepam 5mg available."));
  it("blocks Valium", () => expectBlocked("Valium for muscle spasm."));
  it("blocks ketamine", () => expectBlocked("ketamine infusion therapy program."));
  it("blocks Spravato", () => expectBlocked("Spravato nasal spray available."));
  it("blocks medicinal cannabis phrase", () => expectBlocked("medicinal cannabis access scheme."));
  it("blocks medical cannabis phrase", () => expectBlocked("our medical cannabis clinic."));
  it("blocks THC product phrasing", () => expectBlocked("THC oil for chronic pain."));
});

// ============================================================================
// C.1 — Negative cases (must PASS clean)
// ============================================================================
describe("Stage C.1 — negative cases (no false positives)", () => {
  it("passes plain weight management copy", () =>
    expectClean("Our weight management program supports lifestyle change."));
  it("passes plain dose strings without drug names", () =>
    expectClean("Take with food. Recommended dose: 5mg daily."));
  it("does not match substring 'ozempicfreezone'", () =>
    expectClean("Our clinic is an ozempicfreezone — supplements only."));
  it("does not match 'preozempictreatment' (word boundary)", () =>
    expectClean("Visit our preozempictreatment counsellor."));
  it("does not match 'cialissimo' Italian word", () =>
    expectClean("She sang fortississimo, almost cialissimo."));
  it("does not match arbitrary brand-sounding nonsense words", () =>
    expectClean("Our brand-new SuperWeightCo program is here."));
  it("does not match the word 'sleep' or 'anxiety' alone", () =>
    expectClean("Sleep matters. Anxiety affects many Australians."));
  it("does not match 'morphology' (substring 'morph')", () =>
    expectClean("The morphology of the cell was abnormal."));
  it("does not match the word 'concert' (substring of Concerta)", () =>
    expectClean("Live concert tomorrow night."));
  it("does not match 'rivet' (substring of Rivotril)", () => expectClean("Hammer in a rivet."));
  it("does not match 'gabapentin' (not in S4 list yet)", () =>
    expectClean("Gabapentin is sometimes prescribed for neuropathy."));
  it("does not match 'paracetamol' (S2)", () =>
    expectClean("Take paracetamol 500mg every 4-6 hours."));
  it("does not match 'ibuprofen' (S2)", () => expectClean("Ibuprofen for inflammation."));

  // Bare "testosterone" without a brand should not trip (we intentionally
  // anchor on brand names because the substance class is educational copy
  // territory; Stage C.3 will handle semantic claims).
  it("passes bare 'testosterone' as educational mention", () =>
    expectClean("Testosterone levels naturally decline with age; here's what research shows."));

  // Bare CBD without THC should pass (CBD is not in our S8 rule).
  it("passes bare 'CBD' as it is not in the S8 rule", () =>
    expectClean("CBD products are available over the counter at low doses."));
});

// ============================================================================
// C.1 — HCP audience exemption
// ============================================================================
describe("Stage C.1 — HCP audience exemption", () => {
  function expectCleanHcp(text: string): void {
    const r = validatePolicy({
      text,
      options: { audienceContext: "hcp" },
    });
    expect(
      r.violations.some((v) => v.category === "schedule_4" || v.category === "schedule_8"),
      `expected NO C.1 violation under HCP audience for: "${text}"`,
    ).toBe(false);
  }

  it("Ozempic passes under HCP audience", () => expectCleanHcp("Ozempic dosing protocol summary."));
  it("Vyvanse passes under HCP audience", () =>
    expectCleanHcp("Vyvanse pharmacokinetics review for clinicians."));
  it("Xanax passes under HCP audience", () =>
    expectCleanHcp("Xanax taper schedules in primary care."));
  it("morphine passes under HCP audience", () =>
    expectCleanHcp("Morphine equivalent dosing chart."));
  it("medicinal cannabis passes under HCP audience", () =>
    expectCleanHcp("Medicinal cannabis prescribing pathways."));
});
