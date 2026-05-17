# Stage B — Regex Leak Filter

> **Status:** v0.1.0 · proprietary (Glasshouse fork) · ships in `compliance/stage-b/`
> **Linear:** [GLA-11](https://linear.app/glasshouse-os/issue/GLA-11)
> **Blueprint:** `BLUEPRINT-2026-05-17-v3.md` §14.2 (Phase 1, week 1) and §21 timeline
> **Origin:** The 7 May 2026 Slack breach in `#convo-app` (see `memory/2026-05-07.md`).

Stage B is the **first gate** in the Glasshouse OS pre-send compliance pipeline.
It is a **pure-regex** filter — no LLM calls, no network, no I/O at evaluate
time. It catches the obvious, structural failure modes that should never reach
an external surface (Slack, Telegram groups, Discord, email, ClickUp/Linear/
GitHub comments, etc.).

If Stage B blocks a message, Stages C–G never run on it.

---

## What it does

Stage B detects nine categories of leak:

| Category              | Severity         | What it catches                                                                                                                                                                                       |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `internal_monologue`  | `warn`           | "Let me check…", "Now I'll…", "Got it —", "OK so…", "Right,", "First I'll…", "Good —", "Alright, let's…" — the SOUL.md forbidden-phrase list.                                                         |
| `tool_refs`           | `block`          | Named agent tools (`exec`, `memory_search`, `web_search`), tool-call XML scaffolding (`<function_calls>`, `<tool_result>`), "calling the X tool" narration.                                           |
| `model_refs`          | `block` (mostly) | `claude-opus-4-7`, `anthropic/<model>`, versioned GPT/Gemini, internal aliases `GPT` / `SONNET` / `HAIKU`, "the LLM said" (warn).                                                                     |
| `file_refs`           | `block`          | `MEMORY.md`, `AGENTS.md`, `SOUL.md`, paths inside `~/.openclaw/`, `memory/*.md`, `BLUEPRINT-YYYY-MM-DD-*`, Linear/ClickUp ticket IDs (`GLA-11`, `CON-83`), absolute `/Users/<name>/.openclaw/` paths. |
| `cross_client`        | `block`          | When `currentClient` is set, mentions of any OTHER known client. Loaded from `config/known-clients.json` (canonical name + aliases).                                                                  |
| `platform_ids`        | `block`          | Slack user/channel/team/DM IDs (`U…`, `C…`, `T…`, `D…`), Telegram chat IDs in suspicious context, Discord snowflakes in suspicious context.                                                           |
| `side_channel`        | `block`          | "DM-ing Blake", "I told Cam", "Writing to daily note", "Logging this to memory", "Note to Blake", "Flagging this to Blake directly".                                                                  |
| `thinking_tags`       | `block`          | Literal `<thinking>` and `</thinking>` (any case), plus the adjacent family `<reasoning>`, `<scratchpad>`, `<inner_monologue>`.                                                                       |
| `debugging_narration` | `warn`           | "Subagent", "spawning", "tool call", "API call", "tokens burned", "context window", "compaction", "this session is…".                                                                                 |

## What it doesn't do

Stage B is **not** the place for:

- **Ambiguity** — "we're on it" might be fine or might be filler. Pass to **Stage C** (LLM policy validator).
- **Regulated-vertical rules** — TGA Schedule 4/8 product names, AHPRA s.133, ASIC financial-promo. Those are **Stage C policy validators** with hand-curated corpora.
- **Hallucination checks** — invented stats, fake URLs, made-up names. **Stage F** (Patronus / Vectara).
- **Topic scope enforcement** — "Was Stage B asked about this topic in this channel?". That's **Stage C.2** (per-channel scope allow-list).
- **Final clean-context review** — full message coherence, tone, billboard test. **Stage E** (Cognition-style clean-context Opus reviewer).
- **Brand-voice enforcement** — wrong tone, wrong reading level. **Stage E + Improvement Loop** (Layer 5).

If a pattern feels like it requires judgement, **it belongs in Stage C, not Stage B.**

---

## Severity model

`evaluate()` returns one of three overall severities:

- **`clean`** — zero violations. Caller can ship.
- **`warn`** — only `warn`-level patterns matched. Stage B's recommendation: surface a warning, do NOT auto-block. The caller (Stage A pipeline driver) decides.
- **`block`** — at least one `block`-level pattern matched. Default action: **do not send**. Override requires explicit human gate + audit entry.

`result.blocked` is a convenience shortcut for `severity === "block"`.

---

## Integration contract

```ts
import { evaluate } from "@glasshouse/compliance-stage-b";

const result = evaluate(messageBody, {
  currentClient: "C2U", // optional: suppress self-references
  extraKnownClients: ["BoltCorp"], // optional: add transient clients
  skipCategories: [], // optional: disable a category (testing)
});

// result shape:
// {
//   blocked: boolean,
//   severity: "clean" | "warn" | "block",
//   violations: Array<{
//     category: LeakCategory,
//     ruleId: string,
//     severity: "block" | "warn",
//     match: string,        // truncated to 200 chars
//     line: number,         // 1-indexed
//     column: number,       // 1-indexed
//     description: string,
//   }>,
//   summary: Record<LeakCategory, number>,
//   evaluatedAt: string,    // ISO-8601 UTC
//   engineVersion: string,  // semver
// }
```

Stage B always returns a result; it never throws on input. Pipeline code branches on `blocked` / `severity`.

The `violations[]` array is **stable-sorted**: block-severity first, then by line, then by column. This guarantees deterministic test output and audit-log determinism.

### Wiring to Stage A (the pipeline driver)

```ts
const b = evaluate(candidate, { currentClient: ctx.client });
if (b.blocked) {
  await auditLog.write({ stage: "B", result: b, candidate });
  return { send: false, reason: "stage-b-blocked", details: b };
}
if (b.severity === "warn" && policy.warningsAreBlocking) {
  return { send: false, reason: "stage-b-warning", details: b };
}
// otherwise fall through to Stage C…
```

### Wiring to Stage C (the LLM policy validator)

Stage C SHOULD receive Stage B's `result` as part of its prompt context, so it
can:

- skip checks Stage B already settled (e.g. don't re-ask "is this internal
  monologue?" if Stage B already flagged it),
- escalate "warn" cases when paired with risky content,
- log a single combined audit entry rather than two separate ones.

---

## Running locally

```bash
# From compliance/stage-b/
pnpm install --ignore-workspace
pnpm test          # runs vitest once
pnpm test:watch    # runs vitest in watch mode
pnpm typecheck     # tsc --noEmit
```

The package is **standalone** (not part of the root pnpm workspace) so it
can be lifted out later — either contributed upstream as a generic
framework or replaced with a faster implementation — without dragging
the rest of the fork along with it.

Test counts on first publish:

- **60** known-leak cases (`test/leak-corpus.test.ts`) — covers all nine
  categories with the SOUL.md / 7 May source phrasing.
- **13** negative-corpus cases (`test/negative-corpus.test.ts`) — clean
  outbound copy that must NOT be flagged.
- **12** engine-shape cases (`test/engine.test.ts`) — the public
  contract.

= **85 user-facing tests + 2 counts** for a total of 87. The PR-gate
floor is the 60+10+12 = 82 substantive cases; new patterns add to the
counts.

---

## Adding a new pattern

1. **Decide the category.** If none of the existing nine fits, you probably
   need a new category — add it to `src/types.ts` `LeakCategory`, the
   `summary` zero-init in `engine.ts`, and the table above.

2. **Append the rule to `src/patterns.ts`** in the matching category array.
   Every rule needs:
   - a stable `id` (`<category>.<short_name>`)
   - `severity` (`block` or `warn`)
   - `pattern` (regex source, no flags — engine adds `g` + default `i`)
   - `caseSensitive: true` if the pattern is an acronym/alias that would
     over-match against ordinary lowercase prose
   - `description` (shown in violation reports)

3. **Add a positive test case** in `test/leak-corpus.test.ts`. Use the
   real phrasing that caused (or could cause) the leak.

4. **Add a negative test** in `test/negative-corpus.test.ts` if the pattern
   is at risk of false positives. Negative tests are how we prevent
   pattern-creep from breaking legitimate outbound copy.

5. **Run `pnpm test`** locally. CI will run it again on the PR.

### Adding a client

Edit `config/known-clients.json`. Each entry:

```json
{
  "name": "Client Display Name",
  "aliases": ["spelling variant", "old name"],
  "caseSensitive": false
}
```

Use `caseSensitive: true` for short acronyms (2–4 caps like `C2U`, `GL`,
`OWG`, `EHS`, `DBA`, `CBG`, `PRC`) that would otherwise over-match
against ordinary text or initialisms in regulated copy.

After adding a client:

1. Run `pnpm test` — the engine tests `listRules` will pick it up.
2. Optionally add a `leak-corpus.test.ts` case that demonstrates the
   block when a different `currentClient` is in scope.

---

## Pattern philosophy

Stage B biases toward **precision over recall**. False positives erode trust
in the gate and tempt operators to disable it. False negatives are
recoverable by Stages C–G — Stage B is one of seven gates, not the only
gate.

Concretely:

- Anchor monologue patterns to start-of-line or sentence boundary. Don't
  match the same phrases used inside ordinary prose.
- Use word-boundary lookarounds (not `\b`) for client names that contain
  non-word characters (e.g. `Co-Group`).
- Case-sensitive `true` is the default for short acronyms that would
  otherwise over-match.
- Tool/model/file refs are `block` because there's no legitimate case for
  them in outbound copy. Monologue + debugging are `warn` because there are
  rare legitimate uses (research summaries, infra status updates).

If a rule is firing on legitimate copy, **tighten the rule**; don't
weaken the negative test.

---

## Upstream / proprietary boundary

Per `GLASSHOUSE-FORK.md`:

- The **engine framework** (`src/engine.ts`, `src/types.ts`, the empty
  category shells) is upstream-shape. It will likely be contributed to
  `openclaw/openclaw` once it stabilises.
- The **pattern library** (`src/patterns.ts`) and **known-clients config**
  (`config/known-clients.json`) are **proprietary** and stay in this fork.
  They encode Glasshouse client identifiers, the 7 May breach context, and
  Glasshouse-specific scaffold filenames (`SOUL.md`, etc.).

When/if we open an upstream PR, the proprietary file will be replaced with
a redacted example file and the engine will load patterns from a
configurable path.

---

## Known Stage-C candidates

Patterns that Stage B can't cleanly catch but Stage C should pick up:

- Tone violations ("the bot just wrote a fucking diary in there") — needs
  LLM judgement on tone/voice.
- Off-topic-for-this-channel detection — needs per-channel scope
  allow-list + LLM scope classifier.
- Subtle scaffolding leaks that don't use the literal forbidden words
  but describe the same internal state ("I'm reasoning through this
  step by step before answering" — no banned phrase, but still
  monologue).
- Hidden client references via context ("the pharmacy client" → which
  one?) — context-dependent; needs Stage E clean-context review.
- Persona drift — agent forgetting to be Alfie / be Glasshouse / hold
  to brand voice. Requires Improvement Loop signals.

These are documented here, not coded as `warn`-level regex, because the
false-positive cost of fuzzy regex would exceed the benefit. Stage C is
where judgement lives.

---

## Maintenance

- **Audit cadence:** weekly review of the violations log until a 30-day
  clean streak (per `memory/2026-05-07.md` carry-forward).
- **Pattern-creep guard:** keep negative-corpus tests green at all times.
  If a negative test fails, the regex is too aggressive — fix the regex,
  not the test.
- **Version bumps:** increment `ENGINE_VERSION` in `src/engine.ts` when:
  - the output shape changes (`EvaluationResult`)
  - a category is added or removed
  - severity of an existing category changes

- **Rule deletions:** never delete a rule outright. Mark it deprecated by
  prefixing the description with `[deprecated]` and keep the test for
  one release cycle to confirm no caller depended on it.
