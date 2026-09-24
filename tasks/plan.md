# Implementation Plan: Integrate Chatbot-4 Context Safely

## Overview

Add the useful report-guidance phrases and reviewed incident examples from `Chatbot-4.md` to the existing DisasTRACE chatbot without sending the raw document to DeepSeek or the mobile client. The chatbot will continue to use deterministic policy and canonical local replies; DeepSeek remains a server-only, constrained selector for unfamiliar safe text.

## Architecture Decisions

- Treat `Chatbot-4.md` as a source document, not a runtime prompt, dataset, or unrestricted knowledge base. Normalize approved content into typed local constants under `lib/chatbot/`.
- Keep the eight currently supported incident types and their existing server-owned nature policy. In particular, `Unknown Cause`, `Patient Transport`, and `Other / non-emergency request` remain non-emergency and cannot auto-dispatch.
- Split the source content into three independently reviewed groups: report-process guidance, incident-classification aliases, and emergency-safety advice. Only the first two can be implemented immediately; the new medical first-aid responses require written CDRRMO/clinical approval.
- A generic question such as “How do I report?” should show the guest/registered reporting checklist and an explicit **Start report** action. It must not silently create a report draft. A concrete incident description may still propose an existing category, subject to user confirmation.
- Never send raw GPS, landmarks, contact details, report tokens, photos, full chat history, or the full `Chatbot-4.md` content to DeepSeek. Provider candidates remain compact, approved IDs and keywords only.

## Current-State Findings

- `lib/chatbot/triage-signals.ts` already covers many `Chatbot-4.md` examples, but several aliases need a reviewed mapping (for example rollover/collision wording, structural-crack wording, and broader flood phrasing).
- `lib/chatbot/policy.ts` currently treats generic report wording as report intent. It needs a separate reporting-guidance path so users can read the steps before choosing to start.
- `lib/chatbot/knowledge.ts` already renders canonical language-specific answers and is the correct home for approved report-process guidance.
- The source document’s responses for unresponsiveness, head injury, and breathing difficulty are high-stakes medical guidance. They must remain out of runtime replies until approved and rewritten for the product’s safety policy.

## Task List

### Phase 1: Content review and typed foundation

#### Task 1: Create an approved Chatbot-4 content map

**Description:** Extract only approved phrases from `Chatbot-4.md` into a typed source module with stable IDs, language variants, category ownership, and source metadata. Keep unapproved medical-response text in a documented review queue rather than application runtime code.

**Acceptance criteria:**

- [x] Each included phrase maps to either report guidance or one of the existing eight incident types.
- [x] No new persisted incident type, nature value, or dispatch action is introduced.
- [x] The three medical-response examples are excluded until written approval is recorded.

**Verification:**

- [x] Focused test confirms every approved alias has one valid mapping.
- [x] TypeScript passes.

**Dependencies:** None.

**Files likely touched:**

- `lib/chatbot/chatbot-4-context.ts` (new)
- `Chatbot-4.md`
- `scripts/verify-chatbot-4-context.ts` (new)

**Estimated scope:** Small.

#### Task 2: Add report-process guidance without auto-starting a draft

**Description:** Add canonical guest and registered reporting checklists, matching the current evidence/GPS/contact contract. Recognize English, Filipino, and Taglish “how do I report?” questions and return guidance plus an explicit UI action to start a report.

**Acceptance criteria:**

- [x] Guest guidance says evidence, incident type, callback number, GPS, landmark, affected people, condition, review, and submit.
- [x] Registered guidance omits a callback-number request and makes landmark optional.
- [x] A generic process question leaves the chatbot in `IDLE`; only the explicit UI action begins a draft.

**Verification:**

- [x] Contract tests cover representative English, Filipino, and Taglish process questions.
- [x] Mobile test confirms the action is visible and no draft begins before a tap.

**Dependencies:** Task 1.

**Files likely touched:**

- `lib/chatbot/knowledge.ts`
- `lib/chatbot/policy.ts`
- `lib/chatbot/contracts.ts`
- `mobile/app/help/chatbot.tsx`
- `scripts/verify-chatbot-contract.ts`

**Estimated scope:** Medium.

### Checkpoint: Guidance foundation

- [x] Existing chatbot contract and mobile-state checks pass.
- [x] Generic guidance questions cannot create, submit, or dispatch a report.
- [ ] CDRRMO reviews the final guest and registered checklist wording.

### Phase 2: Deterministic report-intent coverage

#### Task 3: Extend reviewed category aliases and precedence rules

**Description:** Add only reviewed `Chatbot-4.md` incident phrases to deterministic triage signals. Preserve event-first and critical-medical precedence, and require existing user confirmation before drafting/submitting.

**Acceptance criteria:**

- [x] Reviewed vehicular, fire, structural, flood, medical, transport, unknown-cause, and non-emergency examples normalize to an existing allowlisted category.
- [x] Ambiguous general questions/concerns do not become incident reports automatically.
- [x] Critical wording continues to override routine transport/complaint wording in the same message.

**Verification:**

- [x] Table-driven tests cover reviewed aliases and unknown-cause routing; pre-existing contract checks cover critical/transport conflicts.

**Dependencies:** Task 1.

**Files likely touched:**

- `lib/chatbot/triage-signals.ts`
- `scripts/verify-chatbot-4-context.ts`
- `scripts/verify-chatbot-contract.ts`

**Estimated scope:** Small.

#### Task 4: Keep server/provider boundaries and analytics explicit

**Description:** Confirm the response route uses only the normalized approved catalog as provider candidates. Add non-sensitive telemetry labels for Chatbot-4 deterministic matches and provider fallbacks so coverage can be measured without storing personal content.

**Acceptance criteria:**

- [x] The raw Markdown file is never included in DeepSeek requests or mobile bundles.
- [x] Sensitive input still prevents a provider request.
- [x] Logs identify only source/reply/category IDs and outcome classes, not message text or personal data.

**Verification:**

- [x] Privacy regression tests reject contact, GPS, landmark, photo URL, token, and report-ID inputs.
- [x] Route and gateway tests pass with provider disabled, malformed, and low-confidence outcomes.

**Dependencies:** Tasks 1 and 3.

**Files likely touched:**

- `app/api/chatbot/respond/route.ts`
- `lib/chatbot/knowledge.ts`
- `lib/chatbot/privacy.ts`
- `scripts/verify-chatbot-contract.ts`
- `scripts/verify-deepseek-gateway.ts`

**Estimated scope:** Medium.

### Checkpoint: Classification safety

- [ ] Deterministic classification, provider validation, and privacy checks pass.
- [ ] No AI response can create a category, submit a report, alter final triage, or trigger dispatch.
- [ ] PACC verifies the category mappings for operational wording.

### Phase 3: Approved emergency-safety replies

#### Task 5: Review and implement high-stakes safety content

**Description:** After CDRRMO/clinical approval, convert the unresponsive-person, head-injury, and breathing-difficulty examples into short, reviewed canonical replies with clear escalation language and no diagnosis. Add them as local knowledge entries, never model-authored responses.

**Acceptance criteria:**

- [ ] Written reviewer approval and final wording are recorded before code is enabled.
- [ ] Replies are language-specific, bounded, and direct the user to report/get emergency help.
- [ ] The chatbot resumes the active report slot after answering.

**Verification:**

- [ ] Knowledge-match tests cover each approved reply and report-slot resumption.
- [ ] Manual CDRRMO review confirms the displayed wording.

**Dependencies:** Tasks 1, 2, and explicit CDRRMO/clinical approval.

**Files likely touched:**

- `lib/chatbot/knowledge.ts`
- `lib/chatbot/chatbot-4-context.ts`
- `scripts/verify-chatbot-contract.ts`

**Estimated scope:** Small.

### Checkpoint: Release validation

- [ ] `npx tsx scripts/verify-chatbot-contract.ts` passes.
- [ ] `npx tsx scripts/verify-chatbot-mobile-state.ts` passes.
- [ ] `npx tsx scripts/verify-deepseek-gateway.ts` passes.
- [ ] Root/mobile TypeScript, lint, and production web build pass.
- [ ] Manual guest and registered Android flows validate report guidance, explicit start, category confirmation, evidence/GPS/contact handling, review edits, and pending-report lock.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Raw examples become an unrestricted model prompt | High | Compile only reviewed typed entries; provider receives candidate IDs/keywords only. |
| Medical advice is unsafe or clinically inaccurate | High | Require CDRRMO/clinical approval and canonical local replies before enabling it. |
| Generic questions accidentally start reports | Medium | Separate `SHOW_REPORT_GUIDE`/explicit start behavior from concrete incident intent; test no-draft behavior. |
| New aliases cause wrong operational classification | High | Deterministic table-driven tests, event/critical precedence, user confirmation, and existing server/PACC triage. |
| Sensitive incident text reaches the AI provider | High | Retain privacy filter and add regression cases for every sensitive field class. |

## Open Questions

1. Who will provide the written CDRRMO/clinical approval for the three new medical first-aid replies?
2. Should the report-process checklist be English-only, Filipino-only, or retain the current English/Filipino/Taglish response variants? The plan assumes all three.
3. Should generic “I have a concern” messages open a support/contact path, or remain a clarification prompt rather than entering an incident report?
