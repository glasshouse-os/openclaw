/**
 * Stage C.2 — Prohibited representations positive + negative corpus.
 *
 * These tests cover every prohibited-representation category and prove
 * the false-positive guards (educational / awareness / research framing
 * must NOT trip).
 */

import { describe, expect, it } from "vitest";
import { validatePolicy } from "../src/engine.js";

function expectBlockedCategory(text: string, category: string): void {
  const r = validatePolicy({ text });
  expect(r.blocked, `expected BLOCK for: "${text}" — got: ${r.summary}`).toBe(true);
  expect(
    r.violations.some((v) => v.category === category),
    `expected category "${category}" for: "${text}"`,
  ).toBe(true);
}

function expectClean(text: string): void {
  const r = validatePolicy({ text });
  expect(r.blocked, `expected CLEAN for: "${text}" — got: ${r.summary}`).toBe(false);
}

// ============================================================================
// Cancer
// ============================================================================
describe("Stage C.2 — cancer prohibited representations", () => {
  it("blocks 'our treatment cures cancer'", () =>
    expectBlockedCategory("Our treatment cures cancer in just 30 days.", "prohibited_cancer"));
  it("blocks 'kills tumour cells'", () =>
    expectBlockedCategory("Studies show it kills tumour cells in vitro.", "prohibited_cancer"));
  it("blocks 'kills tumor cells' (US spelling)", () =>
    expectBlockedCategory("Studies show it kills tumor cells.", "prohibited_cancer"));
  it("blocks 'eliminates carcinoma'", () =>
    expectBlockedCategory("The protocol eliminates carcinoma.", "prohibited_cancer"));
  it("blocks 'fights cancer'", () =>
    expectBlockedCategory("Our product fights cancer at the cellular level.", "prohibited_cancer"));
  it("blocks 'prevents melanoma'", () =>
    expectBlockedCategory("It prevents melanoma when used daily.", "prohibited_cancer"));
  it("blocks 'cures leukaemia'", () =>
    expectBlockedCategory("The therapy cures leukaemia.", "prohibited_cancer"));
  it("blocks 'cures leukemia' (US)", () =>
    expectBlockedCategory("The therapy cures leukemia.", "prohibited_cancer"));
  it("blocks 'beats lymphoma'", () =>
    expectBlockedCategory("Our patients have beaten lymphoma.", "prohibited_cancer"));
  it("blocks 'reverses sarcoma'", () =>
    expectBlockedCategory("Reverses sarcoma growth over six weeks.", "prohibited_cancer"));
  it("blocks 'cancer can be cured by our pill'", () =>
    expectBlockedCategory("Cancer can be cured with the right protocol.", "prohibited_cancer"));
  it("blocks 'tumours are eliminated by our therapy'", () =>
    expectBlockedCategory("Tumours are eliminated by the daily regimen.", "prohibited_cancer"));
  it("blocks product framing within proximity of cancer", () =>
    expectBlockedCategory(
      "Our product targets the underlying cancer pathway.",
      "prohibited_cancer",
    ));

  // ---- False-positive guards ----
  it("PASSES 'cancer awareness month'", () =>
    expectClean(
      "October is Breast Cancer Awareness Month — get involved with our community fundraiser.",
    ));
  it("PASSES 'supporting families affected by cancer'", () =>
    expectClean(
      "We are proud to support families affected by cancer through our community grant.",
    ));
  it("PASSES research framing without product claim", () =>
    expectClean(
      "Recent research into cancer treatments at the Garvan Institute is showing promise.",
    ));
  it("PASSES 'cancer charity walk'", () =>
    expectClean("Join the annual cancer charity walk this Sunday at Centennial Park."));
  it("PASSES 'history of cancer in the family'", () =>
    expectClean(
      "If you have a history of cancer in your family, speak to your GP about screening.",
    ));
});

// ============================================================================
// STI
// ============================================================================
describe("Stage C.2 — STI prohibited representations", () => {
  it("blocks 'cures chlamydia'", () =>
    expectBlockedCategory("One pill cures chlamydia in 24 hours.", "prohibited_sti"));
  it("blocks 'treats gonorrhoea'", () =>
    expectBlockedCategory("Treats gonorrhoea fast with our 7-day program.", "prohibited_sti"));
  it("blocks 'eliminates herpes'", () =>
    expectBlockedCategory("Our formula eliminates herpes flare-ups.", "prohibited_sti"));
  it("blocks 'cures HPV'", () =>
    expectBlockedCategory("Cures HPV at the source.", "prohibited_sti"));
  it("blocks 'treats genital herpes'", () =>
    expectBlockedCategory("We treat genital herpes online today.", "prohibited_sti"));
  it("blocks 'STIs can be cured'", () =>
    expectBlockedCategory("STIs can be cured with our daily protocol.", "prohibited_sti"));

  // ---- False-positive guards ----
  it("PASSES STI awareness copy", () =>
    expectClean("STI testing is free and confidential at sexual health clinics."));
  it("PASSES general herpes information", () =>
    expectClean("Cold sores are caused by HSV-1; here's what to know."));
});

// ============================================================================
// HIV / AIDS
// ============================================================================
describe("Stage C.2 — HIV / AIDS prohibited representations", () => {
  it("blocks 'treats HIV in 90 days'", () =>
    expectBlockedCategory("Treats HIV in 90 days.", "prohibited_hiv"));
  it("blocks 'cures AIDS'", () =>
    expectBlockedCategory("Our supplement cures AIDS.", "prohibited_hiv"));
  it("blocks 'eliminates HIV'", () =>
    expectBlockedCategory("Eliminates HIV from the bloodstream.", "prohibited_hiv"));
  it("blocks 'prevents HIV' product claim", () =>
    expectBlockedCategory("Our nutraceutical prevents HIV transmission.", "prohibited_hiv"));
  it("blocks 'HIV can be cured by our product'", () =>
    expectBlockedCategory("HIV can be cured with this regimen.", "prohibited_hiv"));
  it("blocks product framing for HIV", () =>
    expectBlockedCategory("Our treatment is the best option for HIV today.", "prohibited_hiv"));

  // ---- False-positive guards ----
  it("PASSES 'HIV awareness week'", () =>
    expectClean("HIV awareness week starts Monday — get involved with World AIDS Day."));
  it("PASSES 'supporting people living with HIV'", () =>
    expectClean(
      "We are committed to supporting people living with HIV through community programs.",
    ));
});

// ============================================================================
// Hepatitis C
// ============================================================================
describe("Stage C.2 — Hepatitis C prohibited representations", () => {
  it("blocks 'cures hepatitis C'", () =>
    expectBlockedCategory("Our protocol cures hepatitis C.", "prohibited_hcv"));
  it("blocks 'treats hep C'", () =>
    expectBlockedCategory("Treats hep C in 12 weeks guaranteed.", "prohibited_hcv"));
  it("blocks 'eliminates HCV'", () =>
    expectBlockedCategory("Eliminates HCV from the liver.", "prohibited_hcv"));
  it("blocks 'HCV can be cured by our therapy'", () =>
    expectBlockedCategory("HCV can be cured with our supplement.", "prohibited_hcv"));

  // ---- False-positive guards ----
  it("PASSES 'hepatitis C testing available'", () =>
    expectClean("Hepatitis C testing is available at your local sexual health clinic."));
});

// ============================================================================
// Mental illness
// ============================================================================
describe("Stage C.2 — mental-illness prohibited representations", () => {
  it("blocks 'our pill ends depression'", () =>
    expectBlockedCategory("Our pill ends depression for good.", "prohibited_mental_illness"));
  it("blocks 'cures depression'", () =>
    expectBlockedCategory("It cures depression naturally.", "prohibited_mental_illness"));
  it("blocks 'treats schizophrenia'", () =>
    expectBlockedCategory(
      "Treats schizophrenia with no side effects.",
      "prohibited_mental_illness",
    ));
  it("blocks 'reverses bipolar disorder'", () =>
    expectBlockedCategory("Reverses bipolar disorder safely.", "prohibited_mental_illness"));
  it("blocks 'eliminates anxiety disorder'", () =>
    expectBlockedCategory("Eliminates anxiety disorder in 30 days.", "prohibited_mental_illness"));
  it("blocks 'cures PTSD'", () =>
    expectBlockedCategory("Our therapy cures PTSD permanently.", "prohibited_mental_illness"));
  it("blocks 'depression can be cured by our protocol'", () =>
    expectBlockedCategory("Depression can be cured with our pill.", "prohibited_mental_illness"));

  // ---- False-positive guards ----
  it("PASSES 'mental health awareness week'", () =>
    expectClean("Mental Health Awareness Week starts Monday. Talk to a mate."));
  it("PASSES 'supporting people with depression'", () =>
    expectClean("We support people living with depression through community check-ins."));
  it("PASSES general mental-health education", () =>
    expectClean(
      "Anxiety is common in Australian adults; here is what research shows about lifestyle factors.",
    ));
  it("PASSES 'helps reduce stress' (soft wellness claim — Stage C.3 territory)", () =>
    expectClean("Our meditation app helps reduce stress and improve sleep."));
});

// ============================================================================
// Abortifacient
// ============================================================================
describe("Stage C.2 — abortifacient prohibited representations", () => {
  it("blocks 'induces abortion'", () =>
    expectBlockedCategory("Our herbal tonic induces abortion safely.", "prohibited_abortifacient"));
  it("blocks 'terminates pregnancy'", () =>
    expectBlockedCategory(
      "Terminates pregnancy in the first trimester.",
      "prohibited_abortifacient",
    ));
  it("blocks bare 'abortifacient' word", () =>
    expectBlockedCategory("Marketed as a herbal abortifacient.", "prohibited_abortifacient"));
  it("blocks 'ends pregnancy'", () =>
    expectBlockedCategory("Ends pregnancy in 48 hours.", "prohibited_abortifacient"));

  // ---- False-positive guards ----
  it("PASSES 'pregnancy support' clinic copy", () =>
    expectClean("We offer pregnancy support and antenatal classes."));
  it("PASSES 'abortion access advocacy'", () =>
    expectClean("We advocate for safe and legal abortion access across Australia."));
});

// ============================================================================
// Tuberculosis
// ============================================================================
describe("Stage C.2 — tuberculosis prohibited representations", () => {
  it("blocks 'cures tuberculosis'", () =>
    expectBlockedCategory("Our remedy cures tuberculosis.", "prohibited_tuberculosis"));
  it("blocks 'treats TB'", () =>
    expectBlockedCategory("Treats TB at the source.", "prohibited_tuberculosis"));
  it("blocks 'TB can be cured by our tonic'", () =>
    expectBlockedCategory("TB can be cured with this herbal tonic.", "prohibited_tuberculosis"));

  // ---- False-positive guards ----
  it("PASSES general TB epidemiology copy", () =>
    expectClean("Tuberculosis remains a global health priority; here is the WHO data."));
});

// ============================================================================
// Schedule 9 therapeutic claims
// ============================================================================
describe("Stage C.2 — Schedule 9 therapeutic claims", () => {
  it("blocks 'treats depression with psilocybin'", () =>
    expectBlockedCategory(
      "Our clinic treats depression with psilocybin.",
      "prohibited_schedule_9",
    ));
  it("blocks 'cures PTSD with MDMA'", () =>
    expectBlockedCategory("Cures PTSD with MDMA in six sessions.", "prohibited_schedule_9"));
  it("blocks 'heals trauma with ayahuasca'", () =>
    expectBlockedCategory("Heals trauma with ayahuasca ceremonies.", "prohibited_schedule_9"));
  it("blocks 'our program with magic mushrooms'", () =>
    expectBlockedCategory(
      "Our program uses magic mushrooms therapeutically.",
      "prohibited_schedule_9",
    ));

  // ---- False-positive guards ----
  it("PASSES policy-discussion framing", () =>
    expectClean(
      "Australia's TGA rescheduled psilocybin and MDMA for authorised prescribers in 2023.",
    ));
});

// ============================================================================
// Combined: text that triggers BOTH C.1 + C.2
// ============================================================================
describe("Stage C — combined C.1 + C.2 violations", () => {
  it("returns both schedule_4 and prohibited_cancer when both fire", () => {
    const text = "Get Ozempic prescribed online — our treatment cures cancer.";
    const r = validatePolicy({ text });
    expect(r.blocked).toBe(true);
    const cats = new Set(r.violations.map((v) => v.category));
    expect(cats.has("schedule_4")).toBe(true);
    expect(cats.has("prohibited_cancer")).toBe(true);
  });

  it("correctly sorts combined violations by category order", () => {
    const text = "Cancer is cured here. Then we prescribe Vyvanse.";
    const r = validatePolicy({ text });
    expect(r.blocked).toBe(true);
    // schedule_8 (cat 1) must come before prohibited_cancer (cat 2).
    const idxS8 = r.violations.findIndex((v) => v.category === "schedule_8");
    const idxCancer = r.violations.findIndex((v) => v.category === "prohibited_cancer");
    expect(idxS8).toBeGreaterThanOrEqual(0);
    expect(idxCancer).toBeGreaterThanOrEqual(0);
    expect(idxS8).toBeLessThan(idxCancer);
  });

  it("includes correct line numbers for multi-line breach", () => {
    const text =
      "Welcome to our clinic.\nWe prescribe Ozempic for weight loss.\nOur treatment cures cancer.";
    const r = validatePolicy({ text });
    const ozempic = r.violations.find((v) => v.rule === "schedule_4.semaglutide");
    const cancer = r.violations.find((v) => v.category === "prohibited_cancer");
    expect(ozempic?.line).toBe(2);
    expect(cancer?.line).toBe(3);
  });
});
