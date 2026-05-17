# Stage C — Regex Policy Validators (C.1 + C.2)

> **Status:** v0.1.0 · proprietary (Glasshouse fork) · ships in `compliance/stage-c/`
> **Linear:** [GLA-12](https://linear.app/glasshouse-os/issue/GLA-12)
> **Blueprint:** `BLUEPRINT-2026-05-17-v3.md` §8.2 (Phase 1, day 2) and §8.3
> **Authority:** Therapeutic Goods Act 1989 ss.42DL/42DLB · Therapeutic Goods Advertising Code 2021 · Poisons Standard February 2026

Stage C is the **regulated-content hardblock** in the Glasshouse OS pre-send compliance pipeline. It runs **after** Stage B (regex leak filter) and **before** Stage C.3 (Opus LLM therapeutic-claim classifier — separate ticket [GLA-13](https://linear.app/glasshouse-os/issue/GLA-13)).

If Stage C blocks a message, Stages D–G never run on it.

---

## What it does

Stage C.1/C.2 enforce two slices of Australian TGA advertising law via pure deterministic regex.

### C.1 — Schedule 4 / Schedule 8 drug-name hardblock

Per **Therapeutic Goods Act 1989 ss.42DL & 42DLB**, any consumer-audience mention of a Schedule 4 (prescription-only) or Schedule 8 (controlled drug) substance — brand OR generic name — is prohibited advertising.

Coverage in v0.1.0:

| Class                    | Examples                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GLP-1 / weight-loss      | semaglutide (Ozempic / Wegovy / Rybelsus), tirzepatide (Mounjaro / Zepbound), liraglutide (Saxenda / Victoza), dulaglutide (Trulicity), phentermine (Duromine / Metermine), Contrave, Xenical |
| Mental-health Schedule 4 | sertraline (Zoloft), escitalopram (Lexapro), fluoxetine (Prozac), citalopram (Cipramil), venlafaxine (Effexor), duloxetine (Cymbalta), mirtazapine (Avanza), bupropion (Wellbutrin / Zyban)   |
| Sleep / sedation         | zolpidem (Stilnox), zopiclone (Imovane), temazepam (Normison)                                                                                                                                 |
| ED / hormone             | sildenafil (Viagra), tadalafil (Cialis), testosterone products (Sustanon / Reandron / Testogel / etc.)                                                                                        |
| Other high-traffic S4    | isotretinoin (Roaccutane), finasteride (Propecia), tretinoin (Retin-A / Stieva-A), prednisolone                                                                                               |
| Schedule 8 opioids       | oxycodone (OxyContin / Endone / Targin), morphine (MS Contin / Anamorph / Ordine / Sevredol / Kapanol), fentanyl (Durogesic)                                                                  |
| Schedule 8 ADHD          | methylphenidate (Ritalin / Concerta), dexamfetamine, lisdexamfetamine (Vyvanse / Elvanse)                                                                                                     |
| Benzodiazepines          | alprazolam (Xanax — S8), diazepam (Valium — S4), clonazepam (Rivotril — S4)                                                                                                                   |
| Other S8                 | ketamine / esketamine (Spravato), medicinal cannabis / THC products                                                                                                                           |

All entries cite the **Poisons Standard February 2026** entry directly in the rule `source` field.

### C.2 — Prohibited representations

Per **TGA Code 2021 Part 2 (ss.6–7)**, the following representations cannot appear in advertising of therapeutic goods regardless of substance:

| Category                    | Authority               | Catches                                                                                                                                    |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `prohibited_cancer`         | TGA Code 2021 s.6(2)(a) | cure / treat / prevent / reverse / heal / fight / kill / eliminate cancer / tumour / carcinoma / leukaemia / melanoma / lymphoma / sarcoma |
| `prohibited_sti`            | TGA Code 2021 s.6(2)(b) | treat / cure chlamydia, gonorrhoea, syphilis, herpes, HPV, STI / STD                                                                       |
| `prohibited_hiv`            | TGA Code 2021 s.6(2)(c) | treat / cure / prevent HIV / AIDS                                                                                                          |
| `prohibited_hcv`            | TGA Code 2021 s.6(2)(d) | treat / cure hepatitis C / HCV                                                                                                             |
| `prohibited_mental_illness` | TGA Code 2021 s.7       | disease-state cure / treat claims re depression, anxiety disorder, schizophrenia, bipolar, PTSD, OCD, psychosis                            |
| `prohibited_abortifacient`  | TGA Code 2021 s.6(2)(e) | induce abortion / terminate pregnancy / abortifacient                                                                                      |
| `prohibited_tuberculosis`   | TGA Code 2021 s.6(2)(f) | treat / cure tuberculosis / TB                                                                                                             |
| `prohibited_schedule_9`     | TGA Code 2021 s.6(2)    | therapeutic claims involving heroin, LSD, MDMA, psilocybin, magic mushrooms, DMT, ayahuasca, mescaline, peyote                             |

Patterns catch:

1. **Direct word order** — verb (core or euphemism) + condition within a 60-char proximity window.
2. **Inverse word order** — condition + passive verb ("can be cured / treated / eliminated").
3. **Product framing** — "our product / treatment / medicine / therapy / pill" within proximity of the condition.

**Built-in false-positive guards** (tested explicitly):

- "Cancer awareness month" — passes clean (no verb).
- "Supporting families affected by cancer" — passes clean.
- "Research into cancer treatments at the Garvan Institute" — passes clean.
- "STI testing is free" — passes clean.
- "HIV awareness week" — passes clean.
- "Mental Health Awareness Week" — passes clean.
- "Helps reduce stress" — passes clean (Stage C.3 territory, not a hardblock claim).

## What it doesn't do — deferred to GLA-13 (Stage C.3)

Stage C.1/C.2 are **the regex hardblock layer only**. Anything requiring judgement is intentionally out of scope and will live in Stage C.3 (Opus classifier, fresh context, TGA case-law corpus).

Things C.1/C.2 **cannot** catch and must NOT be relied upon to catch:

- **Therapeutic-claim semantics without naming a drug** — "weight-loss medication that requires a prescription", "GLP-1 agonists for sustainable weight management", "clinically proven appetite suppressants". These are semantic claims that map to Schedule 4/8 without naming the substance.
- **Telehealth-linkage breaches** — "talk to our doctor about prescription treatments for sleep". Per TGA's published guidance: _"The promotion of a health service (including telehealth) as a means to obtain a prescription-only medicine is likely to amount to advertising prescription-only medicines."_ Stage C.2 cannot reason about service-linkage.
- **AHPRA s.133 testimonials** — patient testimonials about regulated health services. Stage C.4 (separate work) handles AHPRA.
- **Restricted-representation Delegate approvals** — some prohibited representations are permitted with explicit TGA Delegate written approval. Stage C.2 hardblocks all of them; Stage C.3 will check for valid Delegate notices.
- **Soft wellness claims** ("improves mood", "supports immune function") — these are S2/S3/listed-medicine territory and require the LLM judgement layer.
- **Brand-new substances added to the Poisons Standard** — the curated list in `patterns.ts` is the v0 authority. Quarterly Poisons Standard amendments must be reviewed and rolled into a `v0.2.0`.

---

## Severity model

Every Stage C violation is `block` severity. There is no `warn` tier.

Stage C is the **hardblock** layer. Severity grading (severe / minor / blocking) lives in Stage E (clean-context Opus reviewer).

`result.blocked` is `true` iff `result.violations.length > 0`.

---

## Integration contract

```ts
import { validatePolicy } from "@glasshouse/compliance-stage-c";

const result = validatePolicy({
  text: messageBody,
  options: {
    audienceContext: "consumer", // default. Use "hcp" to skip C.1 for HCP-only deliverables.
    skipCategories: [], // escape hatch for tests; production callers leave empty.
  },
});

// result shape:
// {
//   blocked: boolean,
//   violations: Array<{
//     category: PolicyCategory,       // 'schedule_4' | 'schedule_8' | 'prohibited_*'
//     rule: string,                   // stable rule id, e.g. "schedule_4.semaglutide"
//     severity: "block",
//     match: string,                  // truncated to 200 chars
//     line: number,                   // 1-indexed
//     column: number,                 // 1-indexed
//     reasoning: string,              // human-readable, with TGA clause / Poisons Standard cite
//   }>,
//   summary: string,                  // e.g. "2 violations: 1 schedule_4, 1 prohibited_cancer"
//   evaluatedAt: string,              // ISO-8601 UTC
//   engineVersion: string,            // "0.1.0"
// }
```

### `audienceContext`

- **`"consumer"` (default)** — strictest interpretation. C.1 + C.2 both run.
- **`"hcp"`** — C.1 (Schedule 4/8 mentions) is skipped, because the TGA Code's practitioner-only-advertising exceptions permit naming prescription-only substances in HCP-targeted materials. C.2 (prohibited representations) is NEVER skipped — those rules apply to all audiences.

The pipeline must explicitly classify a deliverable as HCP-only before passing `"hcp"`. The default is `"consumer"` and Stage C errs on the strictest interpretation.

### Stability guarantees

- **Pure function.** No I/O, no network, no LLM. Safe to call from anywhere in the pipeline.
- **Deterministic.** Same input → identical output (modulo `evaluatedAt` timestamp).
- **Stable sort.** Violations are sorted by category → line → column → rule id. Audit logs are byte-stable across runs.
- **Stable rule ids.** `id` fields survive across versions; downstream consumers (audit-log queries, allow-lists, suppression rules) can refer to specific rules.

---

## Authorities

- **Therapeutic Goods Act 1989** — [ss.42DL / 42DLB](https://www.legislation.gov.au/C2004A03952/latest/text)
- **Therapeutic Goods Advertising Code 2021** — [full text](https://www.legislation.gov.au/F2021L01861/latest/text)
- **Poisons Standard (Therapeutic Goods (Poisons Standard — February 2026) Instrument)** — [TGA scheduling decisions](https://www.tga.gov.au/resources/publication/scheduling-decisions/poisons-standard)
- **TGA advertising of health services guidance** — [tga.gov.au/resources/guidance/advertising-health-service](https://www.tga.gov.au/resources/guidance/advertising-health-service)

---

## Tests

```bash
cd compliance/stage-c
pnpm install --ignore-workspace
pnpm typecheck
pnpm test
```

v0.1.0 ships with **173 tests** across three suites:

- `test/engine.test.ts` — engine contract, sort order, HCP exemption, determinism.
- `test/schedule-corpus.test.ts` — C.1 positive cases (every substance), negative cases (substring guards, dose strings), HCP exemption cases.
- `test/prohibited-representations.test.ts` — C.2 positive cases (every category, multiple verb forms, inverse word order, product framing), false-positive guards (awareness / research / education / advocacy framing).

Every drug-name rule has at least one positive case and at least one substring-safety negative case. Every prohibited-representation rule has at least one false-positive guard test.

---

## Adding a new rule

1. Append the rule to the matching array in `src/patterns.ts` with:
   - A stable `id` (e.g. `schedule_4.<generic_name>`).
   - The full word-boundary regex.
   - A `source` citing the Poisons Standard entry or TGA Code clause.
2. Add a positive test in the matching `test/*-corpus.test.ts` or `test/prohibited-representations.test.ts` file.
3. Add a substring-safety / false-positive guard test.
4. Run `pnpm test` locally — must be green before commit.
5. The CI workflow `.github/workflows/compliance-stage-c.yml` runs the same suite on every push touching `compliance/stage-c/**`.

If the rule requires judgement to fire (e.g. "weight-loss medication" without naming a drug), it does NOT belong in Stage C.1/C.2 — it belongs in Stage C.3 (GLA-13).
