# Glasshouse OS — OpenClaw Fork

This is the Glasshouse private fork of [openclaw/openclaw](https://github.com/openclaw/openclaw).

It extends the OpenClaw runtime with the Glasshouse Operating System layers:
model routing, memory abstraction, compliance pipeline, observability, improvement
loop, and the operating-model layer. Some of this is universal infrastructure that
should flow upstream to OpenClaw; some is Glasshouse-proprietary and stays in this
fork.

This document defines the **upstream vs proprietary boundary** so the question is
never ambiguous when a change is made.

- **Date:** 17 May 2026 (Phase 0, Foundation Week)
- **Linear:** [GLA-5 Fork OpenClaw + document upstream-vs-proprietary boundary](https://linear.app/glasshouse-os/issue/GLA-5)
- **Source of truth (architecture):** [`BLUEPRINT-2026-05-17-v3.md`](../BLUEPRINT-2026-05-17-v3.md) in the parent workspace.
- **Execution plan:** [`EXECUTION-PLAN-2026-05-17.md`](../EXECUTION-PLAN-2026-05-17.md).

---

## The Q4 lock (17 May 2026 decision)

> *"Contribute universal pieces upstream, keep proprietary in the GHG fork."*

Translation: anything that any agent-runtime user would benefit from goes upstream
as PRs to `openclaw/openclaw`. Anything that encodes Glasshouse-specific verticals,
compliance corpora, client identifiers, brand-voice fine-tunes, or operating-model
internals stays here.

---

## Provenance table — what goes where

The rule of thumb: **if the artefact references "Glasshouse", "TGA/AHPRA/ASIC",
"client X", "regulated", "brand voice", or any Glasshouse-internal identifier,
it's proprietary. Otherwise it's a candidate for upstream.**

### Layer 1 — Model Routing

| Component | Upstream / Proprietary | Why |
|---|---|---|
| `routing.yaml` schema + parser | **Upstream** | Generic routing config any agent runtime can use |
| Default-model routing rules (text, code-agent-loop, long-context, web, image, video, voice) | **Upstream** | Universal model defaults; not Glasshouse-specific |
| Cost-cliff warnings (e.g. GPT-5.5 272K, Gemini 200K) | **Upstream** | Public model facts |
| `degraded_mode` config primitive | **Upstream** | Universal pattern (vendor outage handling) |
| Sonnet/Haiku quarantine guardrails | **Upstream** | Generic gating primitive — any user can configure their own quarantine |
| Multi-agent research pipeline pattern (Opus lead + Sonar/Gemini fanout) | **Upstream** | Pattern, not implementation specific to us |
| Provenance annotation column on routing.yaml | **Upstream** | Generic feature |
| **TGA/AHPRA/ASIC-specific routing rules** | **Proprietary** | Glasshouse vertical |
| **Per-client cost ceilings** | **Proprietary** | Glasshouse client identifiers |
| **Brand-voice fine-tune routing** | **Proprietary** | Glasshouse client data |

### Layer 2 — Memory

| Component | Upstream / Proprietary | Why |
|---|---|---|
| `MemoryBackend` abstraction interface | **Upstream** | Generic vendor-neutral primitive (Anthropic, Mem0, Letta, custom) |
| Anthropic Memory Tool reference implementation | **Upstream** | Standard reference impl |
| YAML frontmatter schema for memory files | **Upstream** | Generic indexable format |
| SQLite FTS5 + Voyage hybrid retriever | **Upstream** | Generic retrieval pattern |
| fswatch indexer + frontmatter parser | **Upstream** | Generic tooling |
| Graphiti temporal knowledge graph integration | **Upstream** | Generic integration |
| Backup + restore tooling | **Upstream** | Generic |
| **Glasshouse client memory namespaces** | **Proprietary** | Client data |
| **TGA / AHPRA / ASIC case-law corpora** | **Proprietary** | Glasshouse vertical IP |
| **Brand-voice corpora per client** | **Proprietary** | Client data |

### Layer 3 — Orchestration + Compliance

| Component | Upstream / Proprietary | Why |
|---|---|---|
| Pre-send pipeline architecture (stages B–G) | **Upstream** | Generic safety pattern |
| Stage B — regex leak filter framework | **Upstream** | Generic leak detection — any agent should have it |
| Stage B default rules (internal monologue, tool refs, <thinking> tags) | **Upstream** | Universal failure modes |
| Stage C policy validator framework | **Upstream** | Generic |
| Stage D adapter (OpenAI Moderation, Lakera, Patronus pluggable) | **Upstream** | Generic |
| Stage E — clean-context reviewer subagent pattern | **Upstream** | Generic safety pattern (Cognition-style) |
| Stage F — hallucination check adapter (Patronus / Vectara) | **Upstream** | Generic |
| Stage G — trust-ladder + human-gate framework | **Upstream** | Generic |
| Immutable audit log schema | **Upstream** | Generic |
| Durable execution adapter (LangGraph / Inngest / Temporal pluggable) | **Upstream** | Generic |
| **TGA Schedule 4/8 regex blocklist** | **Proprietary** | Glasshouse vertical IP |
| **AU prohibited-representations regex blocklist** | **Proprietary** | Glasshouse vertical IP |
| **TGA case-law summary corpus** | **Proprietary** | Glasshouse vertical IP, hand-curated |
| **AHPRA s.133 testimonial rules** | **Proprietary** | Glasshouse vertical IP |
| **ASIC financial-promo rules** | **Proprietary** | Glasshouse vertical IP |
| **Client-specific scope allow-lists** | **Proprietary** | Client identifiers |
| **Glasshouse trust-ladder thresholds** | **Proprietary** | Operating model |

### Layer 4 — Observability

| Component | Upstream / Proprietary | Why |
|---|---|---|
| OpenTelemetry + OpenInference instrumentation | **Upstream** | Standard, industry-aligned |
| Resource attribute schema (`agent.name`, `client.id`, `project.id`, `task.type`, `session.id`, etc.) | **Upstream** | Generic semantic conventions |
| Langfuse integration patterns | **Upstream** | Standard |
| Alert threshold framework (per-turn, per-session, per-agent, fleet) | **Upstream** | Generic |
| KPI definitions (first-pass acceptance, rework rate, cost-per-task, drift catches) | **Upstream** | Generic |
| Cache-ratio monitoring | **Upstream** | Generic |
| **Per-client cost dashboards** | **Proprietary** | Client identifiers |
| **Glasshouse internal command centre (Growth / Ops / BD / Quality / CSAT / Exit)** | **Proprietary** | Operating model |

### Layer 5 — Improvement Loop

| Component | Upstream / Proprietary | Why |
|---|---|---|
| Labelled-dataset infrastructure | **Upstream** | Generic |
| DSPy / TextGrad compile patterns | **Upstream** | Generic patterns |
| Quality-scoring framework | **Upstream** | Generic |
| **Brand-voice fine-tunes per client** | **Proprietary** | Client data |
| **Labelled dataset of Glasshouse deliverables** | **Proprietary** | Glasshouse IP |

### Layer 6 — Operating Model

The entire operating model layer is **proprietary**. It encodes the Glasshouse
agency operating system — client journey, channel-expert playbooks, universal agent
template provisioning specific to Glasshouse defaults, reporting framework, and the
internal command centre.

Some sub-pieces may have generic patterns worth extracting (e.g. "universal agent
provisioning script framework" is generic; the *Glasshouse default scaffolds* are
proprietary), but as a whole, Layer 6 stays in this fork.

| Component | Upstream / Proprietary | Why |
|---|---|---|
| Universal agent provisioning script — framework | **Upstream** | Generic provisioning pattern |
| Universal agent provisioning script — Glasshouse defaults (SOUL/AGENTS/USER scaffolds, compliance wiring) | **Proprietary** | Glasshouse identity |
| Client onboarding webhook + intake-form schema | **Proprietary** | Operating model |
| Channel-expert playbooks (SEO, Meta, Google Ads, Content, Web/Dev, Email, Organic Social) | **Proprietary** | Glasshouse IP |
| Standard client journey orchestration | **Proprietary** | Operating model |
| AI note-taker → action-item → ClickUp pipeline | **Upstream** (generic plumbing) + **Proprietary** (Glasshouse routing rules) | Split |
| Standard monthly report template | **Proprietary** | Glasshouse brand |
| Data connectors (GSC, GA4, Meta, Google Ads, ClickUp → unified) | **Upstream** | Generic |
| Reporting auto-population engine | **Upstream** | Generic |

---

## Default test for any new change

When you're about to commit anything, ask:

1. **Would a non-Glasshouse OpenClaw user benefit from this?**
2. **Does it reference any Glasshouse-internal name, vertical, or identifier?**
3. **Does it encode any client-specific knowledge?**

If (1) = yes AND (2) = no AND (3) = no → it's an upstream PR candidate. Push to
this fork on a branch, then open a PR to `openclaw/openclaw`. Only merge into our
`main` after upstream review (or as proprietary if upstream declines).

If (1) = yes BUT (2) or (3) = yes → split it. The generic primitive goes upstream;
the Glasshouse-specific config stays here.

If (1) = no → goes here only.

---

## Working with the fork

```bash
# Clone (one-time)
cd ~/.openclaw/workspace/glasshouse-os
git clone https://github.com/glasshouse-os/openclaw.git
cd openclaw
git remote add upstream https://github.com/openclaw/openclaw.git

# Stay in sync with upstream (run weekly)
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# Make a Glasshouse-only change
git checkout -b ghg-<feature>
# ... edit ...
git commit
git push origin ghg-<feature>
# (No upstream PR — stays in fork)

# Make an upstream-candidate change
git checkout -b upstream-<feature>
# ... edit ...
git commit
git push origin upstream-<feature>
# Open PR from glasshouse-os/openclaw:upstream-<feature> → openclaw/openclaw:main
# Once merged upstream, sync via the steps above
```

---

## Branch naming convention

| Prefix | Meaning |
|---|---|
| `upstream-*` | Change targeted at upstream PR. Should pass the 3-question test cleanly. |
| `ghg-*` | Glasshouse-proprietary change. Stays in fork. |
| `feat-*` | Work-in-progress, not yet categorised. Decide before merge. |

---

## Why this matters

The strategic-acquirer thesis (Q3 lock — foreign AI-native primary) requires that
our IP look defensible and our code look clean. A messy fork where everything is
intermingled signals "this is a small agency's scripts" to a buyer. A clean fork
with explicit upstream contributions and a clearly-bounded proprietary surface
signals "this is a team that can ship infrastructure and knows where its moat is."

Same architectural hygiene matters for our compliance audit log, our improvement
loop, and our operating model: clean boundaries make the whole system more
inspectable.

— Alfie + Blake, 17 May 2026
