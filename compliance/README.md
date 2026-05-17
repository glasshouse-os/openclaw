# Glasshouse OS — Compliance Pipeline

Pre-send safety pipeline for Glasshouse OS agents. See
`../BLUEPRINT-2026-05-17-v3.md` §14.2 and §21 for the full design.

| Stage | Module                                                                   | Status                                   |
| ----- | ------------------------------------------------------------------------ | ---------------------------------------- |
| A     | Pipeline driver                                                          | _not yet built_                          |
| **B** | **Regex leak filter**                                                    | **✓ shipped** ([`stage-b/`](./stage-b/)) |
| C     | LLM policy validator (cross-client, scope, internal-monologue ambiguity) | _planned_                                |
| C.2   | TGA / AHPRA / ASIC policy regex                                          | _planned (Phase 1, Day 2)_               |
| C.3   | Opus LLM classifier + TGA case-law corpus v0                             | _planned (Phase 1, Day 3–5)_             |
| D     | OpenAI Moderation + Lakera adapter                                       | _planned (Phase 1, Day 14–15)_           |
| E     | Clean-context Opus reviewer                                              | _planned (Phase 1, Day 8–13)_            |
| F     | Hallucination check (Patronus / Vectara)                                 | _planned (Phase 1, Day 8–13)_            |
| G     | Trust-ladder + human-gate framework                                      | _planned (Phase 1, Day 16–17)_           |

Boundary note (per `GLASSHOUSE-FORK.md`): the **framework** for Stages B
and C is upstream-shape; the **patterns / corpora / client list** are
proprietary and stay in this fork.
