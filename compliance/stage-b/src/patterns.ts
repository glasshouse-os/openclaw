/**
 * Stage B — Regex Leak Filter — Pattern Library
 *
 * Each rule has a stable id, a category, a severity, and a regex source.
 * Flags applied by the engine:
 *   - always `g`  (global, so we find every occurrence)
 *   - default `i` unless `caseSensitive: true` (some aliases like `SONNET`
 *     would over-match against the English word "sonnet" if case-folded).
 *
 * Severity model:
 *   - `block` = compliance-critical, MUST be redacted before external send.
 *   - `warn`  = quality/style violation, SHOULD be redacted; caller may
 *               override with audit entry.
 *
 * Adding patterns:
 *   1. Append to the relevant category array below.
 *   2. Add at least one positive test case in `test/patterns.test.ts`.
 *   3. Add a negative test if the pattern is at risk of false positives.
 *
 * The patterns themselves intentionally bias toward precision over recall.
 * Stage C (LLM judgement) is where ambiguous cases live — Stage B is the
 * "dumb gate" that catches the obvious leaks at ~zero cost.
 */

import type { PatternRule } from "./types.js";

// ----------------------------------------------------------------------------
// 1. INTERNAL MONOLOGUE (warn)
// ----------------------------------------------------------------------------
// Captures the "thinking out loud" voice that leaked into #convo-app on
// 7 May. Anchored to start-of-line or sentence to avoid matching the same
// phrases used naturally inside a normal sentence (e.g. "let me know").
export const INTERNAL_MONOLOGUE: PatternRule[] = [
  {
    id: "internal_monologue.let_me",
    category: "internal_monologue",
    severity: "warn",
    // "Let me" / "let me check" / "let me see" / "let me try" at start of
    // a clause. The negative lookahead avoids "let me know" which is a
    // perfectly fine outbound phrase ("let me know when you're ready").
    pattern:
      "(?:^|[.!?]\\s+|\\n\\s*)let\\s+me\\s+(?!know\\b)(?:check|see|try|just|first|quickly|grab|pull|run|verify|look|think|recap|confirm|understand|figure|work|dig|sort|do|start|wrap|finish)",
    description: 'Internal-monologue opener ("let me <verb>"). Acceptable: "let me know".',
  },
  {
    id: "internal_monologue.now_ill",
    category: "internal_monologue",
    severity: "warn",
    pattern: "(?:^|[.!?]\\s+|\\n\\s*)now\\s+(?:i'?ll|i\\s+will|i'?m\\s+going\\s+to|let'?s)\\b",
    description: "\"Now I'll / Now I'm going to / Now let's\" — step narration.",
  },
  {
    id: "internal_monologue.on_it_checking",
    category: "internal_monologue",
    severity: "warn",
    pattern: "\\bon\\s+it[,\\s\\-—]+(?:checking|looking|running|verifying|grabbing|pulling)\\b",
    description: '"On it, checking…" filler narration.',
  },
  {
    id: "internal_monologue.got_it_dash",
    category: "internal_monologue",
    severity: "warn",
    // Common bot tic: "Got it —" / "Got it -" at sentence start as a thought
    // transition. Avoids matching "got it" in normal acknowledgement contexts
    // ("yeah got it, thanks") by requiring an em/en/hyphen dash separator.
    pattern: "(?:^|\\n\\s*)got\\s+it\\s*[—–\\-]",
    description: '"Got it —" thought-transition opener.',
  },
  {
    id: "internal_monologue.ok_so",
    category: "internal_monologue",
    severity: "warn",
    pattern: "(?:^|\\n\\s*)(?:ok|okay)[,\\s]+so[,\\s\\b]",
    description: '"OK so…" thought-transition opener.',
  },
  {
    id: "internal_monologue.right_transition",
    category: "internal_monologue",
    severity: "warn",
    // "Right," as a thought transition (start of line / paragraph).
    // The trailing comma + space + lowercase word distinguishes it from
    // "right" in normal use ("you're right").
    pattern: "(?:^|\\n\\s*)right,\\s+(?:so|let|now|first|next|moving|onto|i)\\b",
    description: '"Right, …" thought-transition opener.',
  },
  {
    id: "internal_monologue.first_ill",
    category: "internal_monologue",
    severity: "warn",
    pattern: "(?:^|[.!?]\\s+|\\n\\s*)first[,\\s]+(?:i'?ll|i\\s+will|i\\s+need\\s+to|let\\s+me)\\b",
    description: '"First I\'ll / First let me…" step narration.',
  },
  {
    id: "internal_monologue.good_dash",
    category: "internal_monologue",
    severity: "warn",
    // "Good —" / "Good -" as a thought transition (very SOUL.md-banned).
    pattern: "(?:^|\\n\\s*)good\\s*[—–\\-]\\s+(?:so|that|let|now|next|onto|the)\\b",
    description: '"Good —" thought-transition opener.',
  },
  {
    id: "internal_monologue.alright_let",
    category: "internal_monologue",
    severity: "warn",
    pattern: "(?:^|\\n\\s*)alright[,\\s]+(?:so|let'?s|now|i'?ll|i\\s+will)\\b",
    description: '"Alright, so / Alright let\'s…" thought-transition opener.',
  },
  {
    id: "internal_monologue.thinking_through",
    category: "internal_monologue",
    severity: "warn",
    pattern:
      "\\b(?:thinking\\s+through|thinking\\s+out\\s+loud|reasoning\\s+through|working\\s+through\\s+this)\\b",
    description: 'Explicit "thinking through / thinking out loud" narration.',
  },
];

// ----------------------------------------------------------------------------
// 2. TOOL REFS (block)
// ----------------------------------------------------------------------------
// Mentioning the names of agent tools (exec, read, write, memory_search,
// etc.) in outbound text exposes the agent scaffolding. We treat any of
// these as a hard block — the user-facing message should never reference
// them.
export const TOOL_REFS: PatternRule[] = [
  {
    id: "tool_refs.named_tool",
    category: "tool_refs",
    severity: "block",
    // Tool names preceded by a word boundary AND followed by a "tool-ish"
    // suffix (call, tool, command, action) — keeps it precise.
    pattern:
      "\\b(?:exec|memory_search|memory_get|sessions_spawn|sessions_yield|web_search|web_fetch|subagent|subagents|process|canvas|voice_call|browser|tts)\\s+(?:tool|call|command|action|invocation|run|result)\\b",
    description: 'Named agent tool reference (e.g. "exec tool", "memory_search call").',
  },
  {
    id: "tool_refs.snake_case_tool",
    category: "tool_refs",
    severity: "block",
    // Standalone snake_case tool identifiers that match our actual tool
    // namespace. Word-boundary anchored.
    pattern:
      "\\b(?:memory_search|memory_get|sessions_spawn|sessions_yield|sessions_list|web_search|web_fetch|voice_call)\\b",
    description: "Snake-case tool identifier from the agent tool namespace.",
  },
  {
    id: "tool_refs.calling_tool",
    category: "tool_refs",
    severity: "block",
    pattern:
      "\\b(?:calling|running|invoking|firing|spawning)\\s+(?:the\\s+)?(?:exec|read|write|memory|web_search|browser|message)\\s+(?:tool|function|call|command)\\b",
    description: '"Calling the X tool" narration.',
  },
  {
    id: "tool_refs.function_call_syntax",
    category: "tool_refs",
    severity: "block",
    // <function_calls> / <invoke> blocks should never appear in outbound
    // text. They render as plain XML in Slack/Discord/email.
    pattern: "<\\/?(?:function_calls?|invoke|parameter|tool_result|antml:[a-z_]+)\\b",
    description: "Function-call XML scaffolding leaked into message body.",
  },
  {
    id: "tool_refs.tool_result_block",
    category: "tool_refs",
    severity: "block",
    pattern: "\\b(?:tool_result|tool_use|tool_call|tool_use_id|function_call_output)\\b",
    description: "Tool result/use block identifier.",
  },
];

// ----------------------------------------------------------------------------
// 3. MODEL REFS (block)
// ----------------------------------------------------------------------------
export const MODEL_REFS: PatternRule[] = [
  {
    id: "model_refs.claude_versioned",
    category: "model_refs",
    severity: "block",
    pattern: "\\bclaude[-\\s]?(?:opus|sonnet|haiku)(?:[-\\s]?\\d+(?:\\.\\d+)?)?\\b",
    description: "Versioned Claude model reference (claude-opus-4-7, claude sonnet, etc.).",
  },
  {
    id: "model_refs.anthropic_namespace",
    category: "model_refs",
    severity: "block",
    pattern: "\\banthropic\\/[a-z0-9\\-_.]+\\b",
    description: "anthropic/<model> namespace reference.",
  },
  {
    id: "model_refs.openai_namespace",
    category: "model_refs",
    severity: "block",
    pattern: "\\b(?:openai|google|deepseek|mistral|xai)\\/[a-z0-9\\-_.]+\\b",
    description: "Provider/model namespace reference.",
  },
  {
    id: "model_refs.gpt_versioned",
    category: "model_refs",
    severity: "block",
    // gpt-4, gpt-4o, gpt-5, gpt-5.5, gpt-5.5-turbo etc.
    // Case-sensitive negative-lookbehind would be ideal; we keep it case-
    // insensitive and rely on the hyphen+digit shape to avoid matching the
    // bare alias `GPT` in a sentence (handled below as a separate rule).
    pattern: "\\bgpt[-\\s]?\\d+(?:\\.\\d+)?(?:[-\\s]?(?:turbo|preview|mini|nano|o))?\\b",
    description: "Versioned GPT model reference.",
  },
  {
    id: "model_refs.alias_gpt",
    category: "model_refs",
    severity: "block",
    caseSensitive: true,
    // Bare `GPT` alias used in SOUL.md / AGENTS.md to mean "the Opus model".
    // Only the all-caps standalone token is blocked (so "GPT-5" still hits
    // model_refs.gpt_versioned and ordinary prose like "GPT models in
    // general" doesn't accidentally pass; that case is also still blocked).
    pattern: "\\bGPT\\b(?!\\-?\\d)",
    description: "Bare `GPT` alias (internal model-routing nickname).",
  },
  {
    id: "model_refs.alias_sonnet",
    category: "model_refs",
    severity: "block",
    caseSensitive: true,
    // Bare `SONNET` alias used in SOUL.md routing.
    pattern: "\\bSONNET\\b",
    description: "Bare `SONNET` alias (internal model-routing nickname).",
  },
  {
    id: "model_refs.alias_haiku",
    category: "model_refs",
    severity: "block",
    caseSensitive: true,
    pattern: "\\bHAIKU\\b",
    description: "Bare `HAIKU` alias (internal model-routing nickname).",
  },
  {
    id: "model_refs.alias_opus",
    category: "model_refs",
    severity: "block",
    // Opus alone is too generic for case-sensitive matching (it's a real
    // English word). We bind it to model-ish context: "Opus" capitalised
    // with a routing/model verb nearby OR Opus + version digit.
    pattern:
      "\\bopus[-\\s]?\\d+(?:\\.\\d+)?\\b|\\b(?:default\\s+to|switch\\s+to|fallback\\s+to|using|via)\\s+opus\\b",
    description: "Opus model reference (versioned or in routing context).",
  },
  {
    id: "model_refs.gemini_versioned",
    category: "model_refs",
    severity: "block",
    pattern:
      "\\bgemini[-\\s]?(?:\\d+(?:\\.\\d+)?(?:[-\\s]?(?:pro|flash|nano|ultra))?|pro|flash)\\b",
    description: "Versioned Gemini model reference.",
  },
  {
    id: "model_refs.the_model",
    category: "model_refs",
    severity: "warn",
    // "The model"/"the LLM"/"the agent" — generic agent self-reference.
    // Warn rather than block because there are rare legitimate cases
    // ("the model is …" in a research context). Reviewer can promote.
    pattern:
      "\\bthe\\s+(?:model|llm|agent|assistant)\\s+(?:said|thinks|decided|chose|picked|generated|hallucinated|responded|outputs?|replied|recommends?)\\b",
    description: 'Generic agent self-reference ("the model said…", "the LLM decided…").',
  },
];

// ----------------------------------------------------------------------------
// 4. FILE / CONFIG REFS (block)
// ----------------------------------------------------------------------------
// References to the agent's scaffolding files. Anything matching here in
// outbound text means the agent talked about its own innards.
export const FILE_REFS: PatternRule[] = [
  {
    id: "file_refs.scaffold_md",
    category: "file_refs",
    severity: "block",
    pattern:
      "\\b(?:MEMORY|AGENTS|SOUL|USER|IDENTITY|TOOLS|HEARTBEAT|BLUEPRINT|VISION|CLAUDE)\\.md\\b",
    description: "Reference to an agent-scaffold .md file.",
  },
  {
    id: "file_refs.openclaw_dotdir",
    category: "file_refs",
    severity: "block",
    pattern: "(?:^|[\\s\"'`(\\[])(?:~\\/)?\\.openclaw(?:\\/[\\w\\-./]*)?",
    description: "Path inside the ~/.openclaw config directory.",
  },
  {
    id: "file_refs.memory_path",
    category: "file_refs",
    severity: "block",
    pattern: "(?:^|[\\s\"'`(\\[])memory\\/[\\w\\-./]+\\.md\\b",
    description: "memory/*.md path reference.",
  },
  {
    id: "file_refs.blueprint",
    category: "file_refs",
    severity: "block",
    pattern: "\\bBLUEPRINT[-_][\\d]{4}[-_][\\d]{2}[-_][\\d]{2}(?:[-_]v\\d+)?\\b",
    description: "BLUEPRINT-YYYY-MM-DD versioned filename.",
  },
  {
    id: "file_refs.linear_ticket",
    category: "file_refs",
    severity: "block",
    caseSensitive: true,
    // Linear-style ticket IDs: GLA-11, CON-83, K-01, C-12. We block the
    // ones tied to internal workstreams. Keep this case-sensitive so we
    // don't choke on natural-language acronyms that happen to share shape.
    pattern: "\\b(?:GLA|CON|EHS|GHG|RAN|C2U|GL|KRU|AVI|OWG)-\\d{1,5}\\b",
    description: "Internal Linear/ClickUp ticket ID.",
  },
  {
    id: "file_refs.workspace_path",
    category: "file_refs",
    severity: "block",
    // Absolute workspace paths leak local filesystem layout.
    pattern: "\\/Users\\/[a-z][a-z0-9_\\-.]*\\/\\.openclaw(?:\\/[\\w\\-./]*)?",
    description: "Local workspace path (/Users/<name>/.openclaw/...).",
  },
];

// ----------------------------------------------------------------------------
// 5. CROSS-CLIENT REFS (block)
// ----------------------------------------------------------------------------
// Built dynamically: see `buildCrossClientRules()` in engine.ts. The
// pattern shape per client is anchored as a word boundary and matches
// the canonical name plus common spelling variants.
export const CROSS_CLIENT_PLACEHOLDER: PatternRule[] = [];

// ----------------------------------------------------------------------------
// 6. SLACK / TELEGRAM IDS (block)
// ----------------------------------------------------------------------------
export const PLATFORM_IDS: PatternRule[] = [
  {
    id: "platform_ids.slack_user",
    category: "platform_ids",
    severity: "block",
    caseSensitive: true,
    // Slack user IDs: U + 8-11 uppercase alphanumerics. Real-world IDs are
    // typically 9-11 chars (U0AT51640MS = 11). The 8+ floor matches the
    // spec and stays safe against false positives.
    pattern: "\\bU[A-Z0-9]{8,11}\\b",
    description: "Slack user ID (Uxxxxxxxx).",
  },
  {
    id: "platform_ids.slack_channel",
    category: "platform_ids",
    severity: "block",
    caseSensitive: true,
    pattern: "\\bC[A-Z0-9]{8,11}\\b",
    description: "Slack channel ID (Cxxxxxxxx).",
  },
  {
    id: "platform_ids.slack_team",
    category: "platform_ids",
    severity: "block",
    caseSensitive: true,
    pattern: "\\bT[A-Z0-9]{8,11}\\b",
    description: "Slack team/workspace ID (Txxxxxxxx).",
  },
  {
    id: "platform_ids.slack_dm",
    category: "platform_ids",
    severity: "block",
    caseSensitive: true,
    pattern: "\\bD[A-Z0-9]{8,11}\\b",
    description: "Slack DM channel ID (Dxxxxxxxx).",
  },
  {
    id: "platform_ids.telegram_id_in_context",
    category: "platform_ids",
    severity: "block",
    // Raw 10-12 digit numbers immediately preceded by a Telegram-ish word
    // ("telegram", "chat", "user", "id"). Avoids flagging phone numbers
    // and timestamps.
    pattern:
      "\\b(?:telegram|chat[_\\s-]?id|user[_\\s-]?id|tg[_\\s-]?id|chat)\\s*[:=]?\\s*(-?\\d{9,13})\\b",
    description: "Telegram chat/user ID in suspicious context.",
  },
  {
    id: "platform_ids.discord_snowflake_in_context",
    category: "platform_ids",
    severity: "block",
    pattern: "\\b(?:discord|guild|channel)\\s*[:=]?\\s*<?@?!?(\\d{17,20})>?\\b",
    description: "Discord snowflake ID in suspicious context.",
  },
];

// ----------------------------------------------------------------------------
// 7. SIDE-CHANNEL DISCLOSURES (block)
// ----------------------------------------------------------------------------
// The literal phrasing from the 7 May breach + adjacent patterns.
export const SIDE_CHANNEL: PatternRule[] = [
  {
    id: "side_channel.dming_someone",
    category: "side_channel",
    severity: "block",
    pattern:
      "\\b(?:dm(?:'?ing|\\s?ing|-ing)?|messaging|pinging|telegramming|whatsapping)\\s+(?:blake|cam|jesse|ben|matt|tim|josh|brett|the\\s+(?:user|client|founder|owner))\\b",
    description: 'Announcing a side-channel DM ("DM-ing Blake", "pinging Cam").',
  },
  {
    id: "side_channel.told_person",
    category: "side_channel",
    severity: "block",
    // "told [Name] about..." — narration of out-of-band conversation.
    pattern:
      "\\b(?:i\\s+(?:just\\s+)?(?:told|asked|messaged|dm'?ed|pinged|warned|flagged|notified|escalated\\s+to))\\s+(?:blake|cam|jesse|ben|matt|tim|josh|brett|the\\s+(?:user|client|founder|owner))\\b",
    description: '"I told/asked/messaged <name>" — side-channel narration.',
  },
  {
    id: "side_channel.writing_to_note",
    category: "side_channel",
    severity: "block",
    pattern:
      "\\b(?:writing|logging|adding|noting|recording|saving)\\s+(?:this\\s+)?(?:to|in|into)\\s+(?:the\\s+)?(?:daily\\s+note|memory|memory\\s+file|memory\\.md|notes?|journal|log|audit\\s+log|clickup|linear)\\b",
    description: '"Writing to daily note / memory / audit log" — internal-state disclosure.',
  },
  {
    id: "side_channel.logging_to_memory",
    category: "side_channel",
    severity: "block",
    pattern:
      "\\b(?:logging|logged|saving|saved|persisting|persisted)\\s+(?:this\\s+|that\\s+)?to\\s+memory\\b",
    description: '"Logging this to memory" — memory-write narration.',
  },
  {
    id: "side_channel.note_to_self",
    category: "side_channel",
    severity: "block",
    pattern: "\\b(?:note\\s+to\\s+(?:self|blake)|reminder\\s+to\\s+self|mental\\s+note)\\b",
    description: '"Note to self / Note to Blake" disclosure.',
  },
  {
    id: "side_channel.flagging_to",
    category: "side_channel",
    severity: "block",
    pattern:
      "\\b(?:flagging|escalating|raising|surfacing)\\s+(?:this\\s+)?(?:to|with)\\s+(?:blake|cam|the\\s+(?:user|client|founder|owner))\\s+(?:directly|separately|privately|via\\s+(?:dm|telegram|whatsapp))\\b",
    description: '"Flagging this to Blake directly/privately" disclosure.',
  },
];

// ----------------------------------------------------------------------------
// 8. THINKING TAGS (block)
// ----------------------------------------------------------------------------
// The literal trojan horse from the 7 May v2 breach. Any case of the open
// or close `<thinking>` tag is a hard block — there is no scenario in which
// these belong in an outbound message body.
export const THINKING_TAGS: PatternRule[] = [
  {
    id: "thinking_tags.open",
    category: "thinking_tags",
    severity: "block",
    pattern: "<\\s*thinking\\s*>",
    description: "Literal `<thinking>` open tag.",
  },
  {
    id: "thinking_tags.close",
    category: "thinking_tags",
    severity: "block",
    pattern: "<\\s*\\/\\s*thinking\\s*>",
    description: "Literal `</thinking>` close tag.",
  },
  {
    id: "thinking_tags.self_closing_variant",
    category: "thinking_tags",
    severity: "block",
    pattern: "<\\s*(?:reasoning|scratchpad|inner_monologue|internal)\\s*\\/?\\s*>",
    description:
      "Adjacent-family scaffolding tag (`<reasoning>`, `<scratchpad>`, `<inner_monologue>`).",
  },
];

// ----------------------------------------------------------------------------
// 9. DEBUGGING NARRATION (warn)
// ----------------------------------------------------------------------------
// Words that strongly indicate the agent is talking about its own runtime
// (tokens, contexts, sessions, subagents). Tightened with adjacency so we
// don't flag every casual use of "session" or "token".
export const DEBUGGING_NARRATION: PatternRule[] = [
  {
    id: "debugging_narration.subagent",
    category: "debugging_narration",
    severity: "warn",
    pattern: "\\b(?:sub[-\\s]?agent|sub[-\\s]?agents?|child\\s+agent|worker\\s+agent)\\b",
    description: "Reference to subagents/child agents.",
  },
  {
    id: "debugging_narration.spawning",
    category: "debugging_narration",
    severity: "warn",
    pattern:
      "\\b(?:spawning|spawned|forking|forked|launching|launched)\\s+(?:a\\s+)?(?:sub[-\\s]?agent|agent|worker|task|process|child)\\b",
    description: '"Spawning a subagent / worker / task" narration.',
  },
  {
    id: "debugging_narration.tool_call",
    category: "debugging_narration",
    severity: "warn",
    pattern: "\\btool[-\\s]?call(?:s|ing|ed)?\\b",
    description: "Reference to tool calls.",
  },
  {
    id: "debugging_narration.api_call",
    category: "debugging_narration",
    severity: "warn",
    pattern: "\\bapi[-\\s]?call(?:s|ing|ed)?\\b",
    description: "Reference to API calls (often paired with model-runtime narration).",
  },
  {
    id: "debugging_narration.token_runtime",
    category: "debugging_narration",
    severity: "warn",
    // "tokens" in a runtime context (cost, burn, budget, window, count).
    pattern:
      "\\b(?:burning|burned|spending|spent|costing|cost|budget|window|count|usage|trace|trace\\s+of)\\s+(?:more\\s+)?(?:than\\s+)?[\\d.,kKmM]*\\s*tokens?\\b|\\btokens?\\s+(?:burned|spent|used|consumed|budget|window|count|usage|cost)\\b",
    description: "Token cost / budget / window narration.",
  },
  {
    id: "debugging_narration.context_window",
    category: "debugging_narration",
    severity: "warn",
    pattern: "\\bcontext\\s+(?:window|length|budget|rot|engineering|compaction)\\b",
    description: "Context-window / context-engineering runtime reference.",
  },
  {
    id: "debugging_narration.compaction",
    category: "debugging_narration",
    severity: "warn",
    pattern:
      "\\b(?:compaction|compacting|compacted|context\\s+reset|/new\\s+session|new\\s+session|fresh\\s+session)\\b",
    description: "Session compaction / context-reset narration.",
  },
  {
    id: "debugging_narration.session_runtime",
    category: "debugging_narration",
    severity: "warn",
    pattern:
      "\\b(?:this|current|the)\\s+session\\s+(?:is|has|will|now|already|started|ended|cost|burned|hit|reached)\\b",
    description: '"This session is/has…" runtime narration.',
  },
  {
    id: "debugging_narration.session_jsonl",
    category: "debugging_narration",
    severity: "warn",
    pattern: "\\bsession\\.jsonl|session[_\\s-]?id|session[_\\s-]?file\\b",
    description: "Reference to session.jsonl / session file / session id.",
  },
];

// ----------------------------------------------------------------------------
// Aggregate
// ----------------------------------------------------------------------------
// Order matters only for tie-breaking in the violations array: block-level
// categories come first so they sort to the top when severities tie.
export const ALL_PATTERNS: PatternRule[] = [
  ...TOOL_REFS,
  ...MODEL_REFS,
  ...FILE_REFS,
  ...PLATFORM_IDS,
  ...SIDE_CHANNEL,
  ...THINKING_TAGS,
  ...INTERNAL_MONOLOGUE,
  ...DEBUGGING_NARRATION,
];
