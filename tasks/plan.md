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

---

# Implementation Plan: Compact PACC Verification Workspace

## Overview

Refine the PACC-only Verification workspace into a compact, desktop-first triage view inspired by the supplied references. Preserve server-authoritative triage, duplicate handling, rejection, dispatch, audit, and realtime behavior. Use the existing authenticated evidence URLs and only a client-side, clearly labelled dummy emergency-assistance configuration using `09364294078`.

## Architecture Decisions

- Queue thumbnails reuse the existing authenticated `VerificationRequest.imageUrl`; no image copies, uploads, database migration, or public data endpoint are needed.
- Retain all operational queue states under four cards: **For Action** = action-needed; **For Review** = review-needed plus responder-offer awaiting records, with an explicit “Awaiting responder” row badge; **Closed** = resolved/case-closed; **Rejected** = rejected/duplicate. This prevents live dispatch work disappearing merely to fit four labels.
- Put the selected report’s concise incident snapshot and timeline together in the right rail. Detailed classification/coordination and related-report controls stay in the center workspace, compacted for desktop and scrollable only on constrained viewports.
- Define incident-type assistance in a typed local module. Each mapping has one agency label and the requested dummy `tel:09364294078` target. It is demo UI data and does not write a coordination action or claim to contact a real agency.
- Use flat semantic colors: navy for action, blue for review/info, green for closed, red for rejected/critical, and amber only for warning/high severity. Reuse `INCIDENT_PRESENTATION` for the Map’s incident-type legend.

## Task List

### Phase 1: Queue and compact triage layout

#### Task 1: Consolidate queue filters and add evidence previews

**Description:** Replace the five-card queue with one horizontal row of For Action, For Review, Closed, and Rejected. Add debounced local search and a small evidence thumbnail/type fallback to each queue item.

**Acceptance criteria:**

- [ ] Exactly four queue cards are visible in one desktop row; none wraps below.
- [ ] Awaiting-responder records remain accessible through For Review with a clear row-level status.
- [ ] Search filters request ID, incident type, reporter, and location without blocking selection or realtime refresh.
- [ ] Submitted images preview safely; reports without one have an accessible type fallback.

**Verification:** Focused queue contract covers four buckets and awaiting retention; manual desktop check confirms thumbnails, search, keyboard selection, and no wrapping.

**Dependencies:** None.
**Files likely touched:** `components/verification/verification-queue.tsx`, `app/(dashboard)/verification/page.tsx`, `scripts/verify-pacc-verification-workspace.ts` (new).
**Estimated scope:** Medium.

#### Task 2: Recompose selected-report workspace for one-screen triage

**Description:** Compact center evidence/location/metrics and move the essential incident snapshot into the right-side dispatch timeline. Preserve classification override, related-report decisions, and agency coordination.

**Acceptance criteria:**

- [ ] Report ID, type, severity, location, received time, people count, evidence, actions, incident snapshot, and dispatch timeline are visible together at the supported desktop breakpoint.
- [ ] Accept, reject, duplicate, classification, coordination, and manual-dispatch eligibility do not change.
- [ ] Smaller viewports use intentional scrolling rather than clipped controls or data.

**Verification:** Manual desktop/tablet checks; existing triage and rejection workflow checks.
**Dependencies:** Task 1.
**Files likely touched:** `components/verification/verification-details.tsx`, `components/verification/resident-panel.tsx`, `app/(dashboard)/verification/page.tsx`, focused script.
**Estimated scope:** Medium.

### Checkpoint: Triage workspace

- [ ] Four queue categories retain every existing operational record.
- [ ] PACC can select, inspect, accept, reject, merge, and dispatch without regression.
- [ ] Desktop layout is manually approved against the supplied references.

### Phase 2: Action rail, dialog, and visual language

#### Task 3: Add typed dummy external emergency assistance

**Description:** Add one type-dependent assistance card below PACC actions, with an agency label and direct `tel:` Call control for the requested dummy number.

**Acceptance criteria:**

- [ ] Fire/explosion selects BFP; medical, vehicular, flood/structural, and other types each resolve to an intentional demo assistance label.
- [ ] Only assistance relevant to the selected incident type appears.
- [ ] Call uses `href="tel:09364294078"`, has an accessible label, and never changes coordination or dispatch state.

**Verification:** Table-driven mapping coverage for all supported types; manual browser check of the Call target.
**Dependencies:** Task 2.
**Files likely touched:** `lib/pacc-emergency-assistance.ts` (new), `components/verification/resident-panel.tsx`, focused script.
**Estimated scope:** Small.

#### Task 4: Expand rejection dialog and apply semantic PACC colors

**Description:** Give the rejection dialog generous desktop space, readable reason cards, notes, and footer actions; normalize verification queue/action colors to the semantic palette.

**Acceptance criteria:**

- [ ] Dialog remains within the viewport and exposes reasons, notes, Cancel, and Reject without crowding.
- [ ] Rejection validation, public-feedback text, and protected API behavior do not change.
- [ ] Queue/action colors consistently communicate action, review, closed, rejected, and severity states.

**Verification:** Keyboard/screen-reader dialog check and rejection-workflow regression.
**Dependencies:** Task 2.
**Files likely touched:** `components/verification/reject-incident-dialog.tsx`, `components/verification/verification-queue.tsx`, `components/verification/resident-panel.tsx`, focused script.
**Estimated scope:** Medium.

#### Task 5: Restore map incident-type legend and password visibility

**Description:** Add an Incident Types section to the shared Map legend using the approved presentation palette, and replace PACC Settings password inputs with the existing accessible `PasswordInput` component.

**Acceptance criteria:**

- [ ] Legend lists every supported incident type with approved color and readable label alongside marker/resource/demand-zone keys.
- [ ] Current Password and New Password each have one independent eye toggle; existing update/disabled behavior remains unchanged.

**Verification:** Static palette/password check and manual toggle/legend check.
**Dependencies:** None.
**Files likely touched:** `components/map/command-map-overlays.tsx`, `components/account/settings-view.tsx`, focused script.
**Estimated scope:** Small.

### Checkpoint: Release validation

- [ ] `npx tsx scripts/verify-pacc-verification-workspace.ts` passes.
- [ ] Existing verification, map, and rejected-report workflow checks pass.
- [ ] `npx tsc --noEmit`, relevant lint, and `npm run build` pass.
- [ ] Manual PACC test covers cards, search, image/no-image preview, assistance/call link, accept/reject/merge/dispatch, modal keyboard behavior, map legend, and both password toggles.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Four categories hide awaiting responder offers | High | Put them in For Review with an Awaiting responder label; test all prior states. |
| Dense layout clips a critical control | High | Desktop grid constraints with responsive overflow fallback; manually test standard and narrow heights. |
| Dummy call card is mistaken for a real directory | Medium | Label it demo assistance, use only the supplied number, persist no coordination state. |
| Preview exposes data outside PACC authorization | High | Reuse authenticated `imageUrl`; add no public storage URL or route. |

## PACC Open Questions

1. For the demo mapping, should vehicular use **PNP**, medical **CDRRMO EMS**, and flood/structural **CDRRMO**, as proposed?
2. Should the UI visibly say “Demo hotline,” or show only agency and number during stakeholder review?

---

## Open Questions

1. Who will provide the written CDRRMO/clinical approval for the three new medical first-aid replies?
2. Should the report-process checklist be English-only, Filipino-only, or retain the current English/Filipino/Taglish response variants? The plan assumes all three.
3. Should generic “I have a concern” messages open a support/contact path, or remain a clarification prompt rather than entering an incident report?
