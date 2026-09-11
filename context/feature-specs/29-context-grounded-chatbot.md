# Feature Spec 29: Context-Grounded Chatbot and Guided Incident Reporting

## Document Status

- Status: Implemented; automated review passed
- Implementation status: The implementation and repeated automated review loop passed on 2026-09-02. Connected Android and multi-role backend validation remains a release-environment gate.
- Primary clients: Expo Android app for guests and approved public users
- Existing system integration: Next.js REST API, current emergency-intake routes, Supabase/Drizzle incident workflow
- AI provider: DeepSeek API
- Model identifier: `deepseek-v4-flash`
- Design references: `context/design-image/chatBot/1chatbot.png` through `6chatbot.png`
- Conversation references: `chatbotContext.md`, `chat-bot-scenes.md`, and the reviewed triage examples in `chat-bot-addtional-data-feed.md`

No application code, database migration, or runtime configuration is changed by this specification.

## 1. Goal

Create a chat-based, selection-assisted DisasTRACE chatbot that can:

1. Answer only questions covered by the approved DisasTRACE, disaster-preparedness, emergency-safety, and Baliwag CDRRMO knowledge context.
2. Guide a guest or approved resident through the existing incident-reporting contract using a natural conversation, selectable controls, and typed answers.
3. Extract information already supplied in a message, ask only for missing required fields, and return to the last unanswered report question after an allowed knowledge question.
4. Require a specific exact number of people involved, entered and sent through the chat composer, instead of offering or accepting a range.
5. Reuse the six incident types already supported by the database and current APIs.
6. Keep the current emergency-intake validation, triage, PACC review, dispatch, tracking, and direct HELP form behavior unchanged.
7. Start report progress UI only after an incident-report draft has actually begun, and start response-status progress only after the server has successfully created the report.
8. Let a user cancel an unsubmitted chatbot draft, or request cancellation of an already-created chatbot report only while the existing server-side cancellation policy permits it.
9. Use DeepSeek efficiently and safely without exposing its API key to the mobile app or making the language model the source of truth.
10. Prevent accidental duplicate submissions and duplicate dispatches while preserving legitimate reports from multiple witnesses.
11. Keep the grounded chatbot available for approved general questions while a submitted report is pending, without allowing the pending report to be edited or submitted again.

## 2. Success Outcome

A guest or approved resident can open the chatbot, ask an in-scope question or begin reporting in Filipino, English, or Taglish, supply information by selecting controls or sending chat messages, review the normalized report, and explicitly submit it through the existing intake API. The chatbot never creates a new incident category, never answers outside its approved context, never submits or cancels a report based only on model output, and never changes the behavior of the current direct HELP reporting path.

## 3. Source-of-Truth Order

The supplied references contain requirements that conflict with the current implementation. Implementation must use the following precedence:

1. System invariants in `context/architecture-context.md`, `context/code-standards.md`, and the current database/API contracts.
2. The explicit requirements in this feature request and this reconciled feature specification.
3. Approved knowledge and conversation behavior from `chatbotContext.md`, `chat-bot-scenes.md`, and reviewed entries from `chat-bot-addtional-data-feed.md`.
4. Layout and interaction inspiration from `context/design-image/chatBot/`.

Visual references are inspiration, not data or behavior contracts. Text in a reference image, such as a red palette, a people-count range, a non-Baliwag map, a mock report number, or an estimated response time, must not be copied when it conflicts with this specification.

### 3.1 Additional typed-report triage feed

`chat-bot-addtional-data-feed.md` contains Filipino, English, and Taglish examples supplied for initial typed-report classification. A reviewed, compact subset is represented as deterministic signal rules at runtime; the full raw feed is never sent to DeepSeek or a mobile client. These examples may prefill an existing incident type and propose `EMERGENCY` or `NON-EMERGENCY` in the report review, but they do not diagnose, dispatch, create categories, or override server validation. Critical signals take precedence when one message contains conflicting routine and critical wording. Final triage and routing remain owned by the existing server/PACC workflow.

For an unfamiliar but privacy-safe report description, the server-only DeepSeek classifier may make the same constrained proposal in English, Filipino, or Taglish. Its response is accepted only at high confidence, only when it contains an allowlisted incident type with that type's policy-matching nature, and only after the mobile user confirms starting a report. Any missing, conflicting, low-confidence, or sensitive/location-bearing message falls back to the guided selector; it is never guessed or dispatched by the model.

## 4. Reconciled Decisions

| Reference or conflict | Required implementation decision |
| --- | --- |
| Reference screens use red as the dominant chatbot color. | Use the DisasTRACE palette: navy `#1E3A8A` for primary actions and selected controls, blue `#3B82F6` for informational state, light gray `#F3F4F6` for the page, and white for surfaces. Red remains limited to genuine critical warnings and destructive confirmation, not general chatbot branding. |
| Scene examples offer `1`, `2-5`, `6-10`, and `More than 10`. | Do not display or accept count ranges. Ask for an exact whole number and let the user type and send it in chat. Keep the current validated range of `1-999`. A response such as `2-5` must receive a clarification asking for one exact number. |
| Scene examples list Patient Transport and Minor Medical Complaint as selectable types. | Do not add either as a database incident type. The visible incident-type selector contains only the existing six types. A free-text patient transport or minor complaint is normalized to existing type `Medical Emergency` with nature `NON-EMERGENCY`, subject to user confirmation in Review. |
| Scene examples sometimes allow a report without evidence when taking a photo is unsafe. | Preserve the current intake API contract requiring evidence. The chatbot must never tell a user to move toward danger. It may let the user pause or cancel the draft, but it cannot submit until required evidence is safely available. |
| Scene examples permit manual location as an alternative to GPS. | Preserve mandatory automatic GPS. A typed place or landmark supplements GPS and never replaces it. Guests still require a landmark of at least five characters; registered residents may leave it blank. |
| Scene text says the registered chatbot should not ask for a landmark. | Preserve the current registered flow: landmark is optional and may be supplied, but it is not a blocking question. The verified account phone is server-derived and is never requested in chat. |
| Knowledge material includes an example medical answer under a section describing information outside the knowledge base. | The grounding rule wins: an answer is allowed only when it is an approved canonical knowledge entry. Conflicting examples are not promoted into the runtime knowledge set. |
| Current chatbot shows a report stepper immediately. | Idle question-and-answer mode has no report stepper. The intake stepper appears only after the user taps a reporting action, selects/takes report evidence, or the server recognizes a report intent and the user confirms it. |
| Reference success screen shows status estimates. | Response progress begins only after the intake POST succeeds. It reflects real persisted report/incident state and must not invent estimated verification or dispatch times. |
| Current direct HELP flow and shared pending screen have evolved independently. | Changes are scoped to chatbot entry, chatbot draft state, and chatbot-origin status/cancel actions. The current direct camera/form reporting behavior remains unchanged. |
| Multiple people may report the same incident, while one device may also retry the same submission. | Treat these as different cases: exact retries from the same chatbot draft are idempotent and return the original report; probable same-incident reports from different witnesses remain auditable records, are flagged by the current nearby-duplicate policy, and can be merged by PACC so they do not create competing operational responses. |
| The current chatbot routes away to a dedicated pending screen after submission. | A chatbot-origin report keeps or returns to a chatbot pending experience containing the real status card and composer. The user may ask approved general questions while status synchronization continues, but report fields are locked and no second report may start until the current report is closed or cancelled. |

## 5. Scope

### 5.1 In Scope

- Guest and approved-resident chatbot modes.
- In-scope contextual question answering.
- Filipino, English, and Taglish intent recognition and matching response style.
- Chat composer input plus selectable controls for bounded fields.
- Dynamic slot filling from one or several user messages.
- Existing photo/evidence capture and upload flow.
- Existing automatic GPS capture and Baliwag warning behavior.
- Exact typed count for people involved.
- Review, field editing, and explicit submission.
- Draft cancellation before submission.
- Chatbot-origin submitted-report cancellation while server policy still allows it.
- Idempotent chatbot submission, active-report restoration, and existing probable-duplicate/PACC merge handling.
- Approved contextual Q&A while a chatbot-origin report is pending.
- Existing guest access-token status mechanism and registered authenticated status mechanism.
- DeepSeek server integration, input/output validation, rate limiting, timeout handling, and deterministic fallback.
- Token and cost controls.
- Focused tests and regression verification.

### 5.2 Out of Scope

- New incident types or database enums.
- Changing PACC classification, verification, merge, coordination, dispatch, or responder workflows.
- Changing the direct resident HELP camera/form path.
- Changing responder reports or responder offline drafts.
- A general-purpose assistant, internet search, live-news lookup, live weather lookup, diagnosis, legal advice, or unrestricted medical advice.
- Voice input, speech-to-text, or text-to-speech solely because microphone icons appear in the reference images.
- DeepSeek image/vision analysis. Evidence continues through current storage and intake APIs and is not sent to the text model.
- Letting the model write directly to the database, call dispatch, cancel a report, or decide the final triage classification.
- Persisting complete chat transcripts in PostgreSQL.
- Replacing deterministic validation with model judgment.
- Automatically rejecting every nearby report as a duplicate; separate witnesses and separate incidents must remain reportable.
- Editing submitted incident details or starting another report from pending-report chat.

## 6. Existing Contracts That Must Remain Unchanged

### 6.1 Incident Types

Only these persisted values are valid:

1. `Medical Emergency`
2. `Vehicular Collision`
3. `Fire Emergency`
4. `Structural Failure`
5. `Flood/Water`
6. `Unknown Cause`

The chatbot may use friendlier labels such as Vehicular Accident or Other / Unknown, but the value sent to the existing API must be one of the six exact persisted strings.

### 6.2 Existing Intake Fields

- `incidentType`: one existing type.
- `nature`: `EMERGENCY` or `NON-EMERGENCY`.
- `peopleInvolved`: exact integer from 1 through 999.
- `victimCondition`: normalized non-empty condition string accepted by the current intake schema.
- `latitude` and `longitude`: mandatory finite GPS coordinates.
- `landmarks`: required for guests, optional for registered residents.
- `contactNumber`: required for guests; server-derived from the verified profile for residents.
- `imageUrl`: required URL returned by the current evidence upload endpoint.
- `severity`: existing value only; final accepted value remains validated by the current API.

### 6.3 Existing Submission and Downstream Behavior

- Evidence continues through `POST /api/emergency-intake/evidence`.
- Guest reports continue through `POST /api/emergency-intake/guest`.
- Registered reports continue through `POST /api/emergency-intake/registered`.
- `submitEmergencyIntake` remains the single path that persists chatbot reports and invokes deterministic initial triage.
- Only `HIGH_CONFIDENCE_EMERGENCY` can start the existing automated ambulance dispatch.
- Other classifications continue to PACC.
- Guest status remains scoped by report ID plus guest access token.
- Registered status remains authenticated and ownership-scoped.
- No database migration is expected for the core chatbot redesign.

### 6.4 Existing Duplicate Handling to Preserve

- The current intake service compares recent reports from the last 20 minutes and flags a report when the incident type and coordinates are sufficiently close.
- A probable nearby duplicate is classified as `SUSPICIOUS_POSSIBLE_PRANK` for PACC review instead of being auto-dispatched.
- PACC retains the existing duplicate-merge workflow, including the `DUPLICATE` outcome and parent request relationship.
- Nearby similarity is not enough to discard a report automatically because it may be a separate incident or useful evidence from another witness.
- The chatbot adds exact-request idempotency and an active-report gate around these existing controls; it does not replace the current operational duplicate policy.

## 7. Architecture Strategy

### 7.1 Principle

Use the language model for narrow interpretation, not authority.

```text
Mobile chat/select UI
        |
        | latest user message + compact non-sensitive draft summary
        v
Next.js chatbot response route
        |
        +--> deterministic guardrails and candidate retrieval
        |
        +--> DeepSeek intent/slot selection when needed
        |
        +--> Zod validation + allowlist normalization
        |
        v
Canonical reply key + safe structured slot updates
        |
        v
Mobile draft state and deterministic controls
        |
        | explicit user confirmation only
        v
Existing evidence + emergency-intake APIs
        |
        v
Existing triage, PACC, dispatch, tracking, and report storage
```

### 7.2 Authority Boundaries

| Concern | Authority |
| --- | --- |
| Allowed knowledge | Versioned local knowledge catalog derived from `chatbotContext.md` |
| Report lifecycle and pending slot | Deterministic mobile/server state machine |
| Incident types and accepted values | Existing schema and shared allowlists |
| Field validation | Zod and existing intake schemas |
| Intent/slot interpretation from free text | DeepSeek suggestion, followed by Zod and allowlist normalization |
| Bot wording | Canonical local reply templates, selected by reply key |
| Submission | Explicit user action calling the existing REST intake route |
| Initial triage | Existing deterministic `submitEmergencyIntake` logic |
| Cancellation permission | Existing report status, ownership/token scope, and incident state |
| Dispatch and tracking | Existing incident and responder workflow |

DeepSeek output must never be displayed or executed until it has been parsed, validated, and mapped to an approved reply or state transition.

## 8. Knowledge Grounding and Out-of-Context Policy

### 8.1 Approved Knowledge Domains

The runtime catalog may contain only reviewed entries from these domains in `chatbotContext.md`:

- DisasTRACE definition, purpose, features, roles, reporting, and limitations.
- General disaster preparedness and emergency planning.
- Go-bag and emergency supplies.
- Flood, typhoon/heavy rain, earthquake, fire, evacuation, and approved basic first-aid guidance.
- Baliwag CDRRMO responsibilities, approved office/contact data, official advisories, and other verified local emergency information.
- Chatbot purpose, limitations, fallback, and return-to-report rules.

Proposed additions in the source document, such as directories or evacuation centers, are not automatically approved knowledge. They require a verified system record before becoming answerable.

### 8.2 Runtime Knowledge Format

Normalize the Markdown source into a reviewed catalog of compact entries. Each entry should contain:

- Stable `knowledgeId`.
- Category and intent.
- Filipino/English/Taglish example utterances or search terms.
- One canonical approved answer.
- Whether the answer can be shown during an active report.
- Optional follow-up action key, such as `START_REPORT` or `SHOW_SUPPORT_CONTACTS`.
- Verification metadata for values that can expire, especially hotlines.

The model returns an approved `knowledgeId`; the server/mobile layer renders the canonical answer. The model does not compose facts from its general training.

### 8.3 Answer Decision Order

1. Detect whether a report draft is active and retain its pending slot.
2. Apply deterministic commands such as cancel draft, start report, continue, go back, or edit.
3. Try deterministic exact/keyword matching against the approved catalog.
4. If needed, give only a small retrieved candidate set to DeepSeek and ask it to select an intent or report action.
5. If no approved candidate passes the confidence threshold, return the canonical out-of-context fallback.
6. If a report is active, append the canonical prompt for the last unanswered report slot.

### 8.4 Required Fallbacks

- Outside scope, no active report: explain that the bot can only help with DisasTRACE, incident reporting, approved emergency safety, and Baliwag CDRRMO information; offer Start Report and supported topics.
- Outside scope, active report: give the shorter scope fallback and immediately resume the exact pending report question.
- Disaster-related but absent from approved knowledge: state that verified information is unavailable and direct the user to official local guidance without inventing instructions.
- Real-time status question not backed by an existing scoped system endpoint: state that the chatbot does not have verified real-time information.
- Unclear input: ask the user to rephrase or show the current valid selections.
- Profanity/frustration: remain calm, avoid reprimanding the user, and resume the pending task.

### 8.5 Data-Minimization Rule

Do not send the following to DeepSeek:

- API keys or access tokens.
- Guest report access token.
- Registered name, phone number, email, address, ID, or profile data.
- Guest callback number.
- Raw GPS coordinates or exact landmark.
- Photo, image URL, or storage path.
- Full database records.
- Full chat history when a compact report-state summary is sufficient.

Only send the latest relevant text, language hint, pending slot, non-sensitive normalized slots, and a small set of candidate knowledge entries.

## 9. DeepSeek Integration Plan

### 9.1 Server-Only Configuration

- Call the official endpoint at `https://api.deepseek.com/chat/completions` from a Next.js Route Handler.
- Use model ID `deepseek-v4-flash`.
- Keep the secret in the Next.js server/deployment environment under one documented non-public variable, preferably `DEEPSEEK_API_KEY`.
- The currently detected `DEEPSEEK_API` key in `mobile/.env` must not be read by the Expo client. Before implementation, copy/rename the configured secret into the server environment and remove any client-side dependency on it. Do not print or commit the value.
- Do not use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix for the secret.
- Put provider-specific fetch/parsing logic in a server-only module.

### 9.2 Request Shape and Model Settings

- Stable system prefix containing the narrow role, grounding rules, approved output schema, and instruction never to answer from general knowledge.
- Dynamic suffix containing only current candidates, compact report state, and latest user message.
- JSON output mode.
- Thinking disabled for this classifier/extractor use case.
- Low response token ceiling because the result is structured metadata, not prose.
- Low randomness for repeatable parsing.
- One short retry only for empty or malformed JSON; then use deterministic fallback.
- A strict request timeout so emergency reporting does not remain blocked by an AI provider.
- An opaque hashed internal `user_id` may be used for provider-side isolation, but it must contain no phone number, email, name, or raw account ID.

### 9.3 Validated Model Result

The model result is a suggestion with these conceptual fields:

- `action`: approved action such as answer context, start report, fill slots, correct slot, continue, cancel draft request, or fallback.
- `knowledgeId`: optional allowlisted ID.
- `languageStyle`: Filipino, English, or Taglish.
- `incidentType`: optional existing incident type only.
- `nature`: optional existing nature only.
- `peopleInvolved`: optional exact integer only.
- `victimCondition`: optional normalized condition key.
- `hasReportIntent`: boolean.
- `confidence`: bounded numeric score.
- `nextSlot`: optional valid report slot.

Unknown fields are stripped. Invalid enums, ranges, or impossible transitions are rejected. A model result can fill a local draft but cannot submit it.

### 9.4 Token-Minimization Strategy

1. Do not send all 1,590 lines of `chatbotContext.md` on each request.
2. Convert it into compact canonical entries and retrieve only the few most likely entries.
3. Keep the system prompt byte-for-byte stable and first in the request so DeepSeek prefix caching can apply.
4. For selection clicks, numeric validation, back/edit actions, GPS, photo, contact validation, and submission, do not call DeepSeek.
5. For exact knowledge matches, render the canonical answer without a model call.
6. Send a structured slot summary instead of replaying the entire conversation.
7. Keep only the latest unresolved user turn and, when necessary, the immediately preceding bot question.
8. Record usage metadata without recording message content: prompt tokens, cache-hit tokens, cache-miss tokens, output tokens, latency, result type, and provider error code.
9. Prefer one interpretation call per user send; never call the model repeatedly for each extracted field.
10. If one message contains several valid fields, apply them together and skip all completed questions.

### 9.5 Provider Failure Behavior

DeepSeek failure must not make emergency reporting unavailable.

- Show a concise non-blocking notice that free-text interpretation is temporarily limited.
- Keep photo, GPS, numeric entry, incident selection, condition selection, review, and submit controls working deterministically.
- Fall back to the approved selection-driven form using the same existing intake APIs.
- Do not silently guess an incident type or report field.
- Handle provider 400/401/402/422 as configuration or request errors, 429 as temporary throttling, and 500/503 as retryable once.

## 10. Chatbot API Boundary

### 10.1 Proposed Route

`POST /api/chatbot/respond`

This route performs interpretation and contextual answer selection only. It does not create or cancel reports.

### 10.2 Input Contract

- Reporter mode: guest or registered.
- Current lifecycle state.
- Current pending slot.
- Compact, non-sensitive completed-slot summary.
- Latest user message with a conservative length limit.
- Current UI language hint.
- Client conversation nonce for abuse control; never treated as authorization.

Registered requests may include an auth bearer token so the route can validate that the caller is an approved public user, but no profile fields are forwarded to DeepSeek. Guest requests are anonymous and require stronger IP/device rate limits.

### 10.3 Output Contract

- Canonical reply key and resolved safe display text.
- Validated slot updates.
- Pending slot after applying the updates.
- Approved selector/control to display next.
- Whether a report draft should begin.
- Whether an active report question must resume after an FAQ answer.
- Recoverable error/fallback information.

### 10.4 Abuse and Reliability Controls

- Zod-validate request and response bodies.
- Limit message length and compact state size.
- Rate-limit guest and registered calls independently using existing infrastructure conventions.
- Do not trust IP or device nonce as identity.
- Use per-request timeout and abort handling.
- Do not cache personalized responses at the Next.js route layer.
- Avoid logging raw user messages, phone numbers, GPS, or model prompts.
- Return consistent `{ data, error, message }` shapes.

## 11. Conversation and Report State Machine

### 11.1 Lifecycle States

```text
ASSISTANT_IDLE
    | report intent confirmed
    v
REPORT_DRAFT
    | all required slots valid
    v
REVIEW
    | explicit submit
    v
SUBMITTING
    | existing intake API succeeds
    v
SUBMITTED_PENDING
    | approved general question
    +-----------------------> GROUNDED_PENDING_ANSWER
    ^                                  |
    | latest real status + reminder <--+
    | verification/dispatch state changes
    v
ACTIVE_RESPONSE

REPORT_DRAFT -- cancel draft --> ASSISTANT_IDLE
SUBMITTED_PENDING -- permitted cancel --> CANCELLED
```

No step transition may infer that a server report exists before the intake POST returns success.

### 11.2 Report Slots

| Slot | Guest | Registered | Input mechanism | AI call required |
| --- | --- | --- | --- | --- |
| Evidence | Required | Required | Current camera flow | No |
| Nature | Required | Required | Select or extracted from free text | Only for free text |
| Incident type | Required | Required | Existing six-type selector or free text | Only for free text |
| Contact number | Required | Server-derived; never asked | Typed phone input | No |
| GPS | Required | Required | Automatic device capture/retry | No |
| Landmark/reference | Required, minimum 5 chars | Optional | Typed chat/location field | No for direct entry |
| Exact people involved | Required, 1-999 | Required, 1-999 | Numeric chat composer and Send | No for digits; optional for words such as `tatlo` |
| Victim condition | Required | Required | Current condition selector or free text | Only for free text |
| Review confirmation | Required | Required | Edit controls and Submit button | No |

### 11.3 Fast Slot Filling

When a message contains multiple details, the interpreter returns all confidently extracted valid slots in one result. The state machine:

1. Applies each valid slot once.
2. Preserves previously completed unrelated slots.
3. Uses the latest explicit correction when the user changes a value.
4. Shows a concise confirmation summary.
5. Asks only for the next missing required slot.

Example behavior: a message indicating a fire, three people, and one unresponsive victim fills incident type, nature, exact people count, and condition. It must not ask those questions again.

### 11.4 Exact People Count

- Prompt: ask for the exact number of people involved or affected.
- Present a numeric composer with Send; do not present range buttons.
- Accept digits and supported number words after deterministic/model normalization.
- Normalize `tatlo` to `3` only when confidence is high and the current pending slot is people count.
- Reject decimals, negative values, zero, values above 999, and ranges.
- If the user says `not sure`, explain that one exact best-known count is required by the current report contract and keep the slot unresolved.
- Display the normalized exact number back to the user before moving on.
- The final review always shows the exact number, never a range label.

### 11.5 Corrections and Editing

- Phrases such as “actually four” while people count is active replace the old value.
- Review rows have Edit actions that return to the corresponding deterministic control.
- A corrected value is revalidated through the same normalizer.
- Editing must not clear unrelated completed fields.
- After editing, return to Review when the field is valid.

### 11.6 Submitted-Pending Chat Mode

After a chatbot-origin intake request succeeds and enters `SUBMITTED_PENDING`:

- Keep the real report-status card visible in the chatbot experience and keep its status synchronization running.
- Keep the composer available only for approved knowledge questions and explicit safe commands such as Track Report, Cancel Report, or Return Home.
- Contextual answers use the same approved knowledge catalog and out-of-context fallback as idle/draft chat.
- After an answer, remind the user that the existing report remains pending and present its latest real status; there is no unanswered draft slot to resume.
- Do not send the request ID, access token, callback number, GPS, landmark, photo, or persisted report details to DeepSeek.
- Do not let a chat response modify submitted fields, re-run intake, change classification, or create a second report.
- A typed cancellation request opens the same deterministic confirmation as the Cancel Report control; model output alone never performs the mutation.
- If the report becomes verified, dispatched, rejected, duplicate, cancelled, or otherwise leaves pending while a question is being answered, the latest server status wins and the UI transitions accordingly.
- Status polling/realtime updates must continue independently of chatbot provider latency or failure.

### 11.7 Duplicate-Prevention Layers

The feature distinguishes an accidental duplicate submission from a separate witness reporting the same event:

1. **Single-flight UI lock:** Disable Send/Submit immediately while a chatbot interpretation or intake submission is in flight.
2. **Stable draft submission ID:** Generate one high-entropy `chatbotSubmissionId` when a draft begins and reuse it for every retry of that draft. The intake boundary validates it and treats a replay as the same operation.
3. **Idempotent server result:** When the same valid chatbot submission ID is received again, return the already-created request/incident result after rechecking registered ownership or guest proof instead of inserting another report or dispatching again. The current `verification_requests.id` can serve as the idempotency identity for chatbot submissions, so no new incident type or duplicate business state is required.
4. **Active-report preflight:** Before a new draft begins and during session restoration, check current local/scoped server state. Restore an unresolved chatbot report rather than showing a second Submit path.
5. **Existing nearby-duplicate screening:** Different submission IDs that describe the same type near the same coordinates remain separate witness reports but follow the current suspicious/duplicate review path instead of immediate duplicate dispatch.
6. **Existing PACC merge:** PACC decides whether separate witness reports refer to the same incident and merges them using the current parent/duplicate workflow.

The system must prevent one chatbot draft or network retry from creating multiple records. It must not automatically discard reports solely because two people reported a nearby incident.

## 12. Progress Indicator Rules

There are two distinct progress indicators and neither may begin prematurely.

### 12.1 Intake Progress

- Hidden in `ASSISTANT_IDLE` while the user asks general questions.
- Starts only when a report draft enters `REPORT_DRAFT`.
- A report draft starts after a clear reporting action or confirmed report intent, not merely because the chatbot screen opened.
- Uses five adaptive phases inspired by the references:
  1. Start: evidence and incident recognition.
  2. Location: GPS and guest contact/landmark requirements.
  3. Details: exact people count and condition.
  4. Review: confirmation and field edits.
  5. Submit: server submission result.
- Completion is calculated from valid required slots, not a hard-coded count of chat messages.
- If one message fills several slots, the indicator may advance several phases after showing what was captured.

### 12.2 Post-Submission Report Status

- Hidden before server creation succeeds.
- Starts only after the existing intake route returns a request ID.
- `Report received` becomes complete from the successful response timestamp.
- `Under verification` or its equivalent is derived from actual request/triage state.
- `Responder dispatched` becomes active only from a real incident/responder state.
- Do not show fabricated ETAs, responder unit names, report references, or timestamps.
- A submission error leaves the user in Review with the draft intact and does not start status progress.
- While the report remains pending, the status card stays visible above or alongside grounded chatbot answers and continues refreshing independently.

## 13. Cancellation Behavior

### 13.1 Cancel an Unsubmitted Chatbot Draft

- Available once `REPORT_DRAFT` begins and before submission succeeds.
- Label: Cancel Draft.
- Require a confirmation explaining that entered chatbot report details and local conversation progress will be cleared.
- On confirmation, clear only chatbot draft state, temporary chat messages, and temporary local evidence reference.
- Do not call an incident/report API because no report exists.
- Return to `ASSISTANT_IDLE` so the user may ask a question or start again.
- On dismissal, resume the exact pending question with all data intact.

### 13.2 Cancel a Submitted Chatbot Report

- Show only for a report that originated from the chatbot and is still cancellable under current server policy.
- Registered resident: reuse the authenticated ownership-scoped cancellation behavior; the server must still verify report ownership and `PENDING` status.
- Guest: add a chatbot-specific token-authorized cancellation boundary using the same report ID plus guest access token already used for status. It may cancel only that guest report.
- Before changing state, the server rechecks that the request is still pending and that no active incident/dispatch has locked cancellation.
- Reuse the current persisted outcome rather than adding a new incident type or broad workflow. If the current schema continues to represent reporter cancellation as `REJECTED`, attach a clear reporter-cancelled reason in existing auditable metadata.
- After cancellation, clear local report credentials and route to the appropriate guest landing or resident home.
- If the report became verified/assigned between display and confirmation, return a controlled conflict and show Call PACC instead.

### 13.3 Locked Cancellation

- Once an incident exists, a responder is assigned, or the report is no longer pending, do not attempt client-side cancellation.
- Show the existing PACC contact action and explain that the command center must coordinate the active response.
- Do not cancel incidents, release responders, or alter dispatch state from chatbot code.
- Do not add the cancel action to reports created through the direct HELP form unless separately requested.

## 14. Mobile UX and Visual Direction

### 14.1 Reference Elements to Keep

- Clear assistant identity and online/service state.
- Conversational left/right message grouping.
- Evidence preview card.
- Selectable incident and condition controls inside the conversation.
- Location confirmation card.
- Sticky message composer and Send action.
- Adaptive progress stepper after reporting begins.
- Review card with per-field Edit actions.
- Submission success and real status timeline.

### 14.2 Palette Translation

| Role | Token |
| --- | --- |
| Primary actions, selected incident controls, active progress | Navy `#1E3A8A` |
| Links, informational accents, location state | Blue `#3B82F6` |
| Page background | Light gray `#F3F4F6` |
| Cards, bubbles, composer | White `#FFFFFF` |
| Body text | Dark gray `#4B5563` |
| Success, captured, submitted | Green `#22C55E` |
| Pending, review, needs attention | Orange `#F97316` |
| Critical warning or destructive confirmation only | Red `#EF4444` |

No dominant red gradient, red bot bubble, red general CTA, or red stepper should be carried over from the reference images.

### 14.3 Interaction Model

- The composer remains available for free-text reporting and in-scope questions.
- Bounded controls remain the fastest path for incident type, condition, location capture, evidence, and confirmations.
- The user can type instead of selecting when the field supports interpretation.
- Do not show microphone behavior unless voice support is separately approved.
- Do not show a generic attachment action that bypasses the required current evidence upload flow.
- Keep keyboard focus, scroll-to-latest-message, Android back behavior, safe areas, and loading-state locking predictable.
- Disable duplicate sends while a chatbot or submission request is active.
- Make every chip, button, and Edit action accessible by label and state, with at least a 44x44 touch target.

### 14.4 Guest and Registered Differences

| Behavior | Guest | Registered resident |
| --- | --- | --- |
| Entry | No account; chatbot only | Separate from existing direct HELP path |
| Contact | Ask and validate Philippine mobile number | Never ask; server uses verified profile phone |
| Landmark | Required | Optional |
| GPS | Required | Required |
| Status reads | Scoped token polling | Existing authenticated behavior |
| Submitted cancellation | Scoped guest token route while eligible | Existing authenticated ownership route while eligible |

## 15. Submission Integration

1. User reaches Review only after all mode-specific required slots are valid.
2. Review displays persisted labels and the exact people count.
3. User may edit any field.
4. User taps Submit Report explicitly; the request carries the stable high-entropy submission ID created for that chatbot draft.
5. Current evidence endpoint uploads the photo if it has not already been uploaded.
6. The app calls the current guest or registered emergency-intake route.
7. The existing API revalidates every field and derives registered contact data.
8. A first successful creation returns `201`; an idempotent retry returns the already-created safe result without creating another request or dispatch. Either result transitions the same draft to submitted status and stores the request/incident/access-token response in current local report state.
9. A failed upload or intake request returns to Review with all local draft fields retained.
10. Existing deterministic triage and dispatch behavior continues unchanged.
11. While the created request is pending, the chatbot composer may answer approved general questions, but it cannot rebuild or resubmit the payload.

The model is not called during evidence upload, final validation, report insertion, deterministic triage, or dispatch.

## 16. Privacy and Security Requirements

- DeepSeek secret is server-only.
- No personal or location data is embedded in client-visible environment variables.
- No raw prompt/message logging in production.
- No photo or photo URL is sent to the text model.
- No guest access token is sent to the model or analytics.
- Guest chatbot endpoint calls are rate-limited even before a report is submitted.
- Registered calls validate the Supabase session when present and never trust a client-supplied account role.
- All final report fields are validated again at the existing intake boundary.
- Model output is treated as untrusted external input.
- Canonical answers are escaped/rendered as text; do not render model-provided HTML or Markdown.
- Cancellation requires a second server-side authorization/status check at mutation time.
- Status/cancel errors must not reveal whether another user's report exists.
- Use opaque event identifiers for metrics; do not record message content.

## 17. Observability Without Sensitive Content

Record enough metadata to operate the integration without retaining conversations:

- Request timestamp and generated trace ID.
- Guest or registered mode.
- Result class: deterministic match, model match, fallback, provider timeout, malformed result, or throttled.
- Selected knowledge ID or report action key, not raw user text.
- Latency and HTTP status.
- Prompt/cache-hit/cache-miss/output token counts returned by DeepSeek.
- Whether deterministic fallback was used.
- Validation rejection category.

Never record callback numbers, coordinates, landmarks, access tokens, photo URLs, full prompts, or free-text messages in these logs.

## 18. Acceptance Scenarios

### 18.1 Context Answers

- Asking what DisasTRACE is returns the approved DisasTRACE answer.
- Asking about an approved go-bag topic returns the canonical entry.
- Asking an unrelated question, such as entertainment or general trivia, returns the scope fallback without an invented answer.
- Asking for unverified real-time flooding or ambulance availability returns the real-time limitation response.
- Asking a permitted question during a report answers it and then repeats the exact unresolved report question.
- Asking a permitted general question while a submitted chatbot report is pending returns the canonical answer, keeps the live pending card visible, and then restates the latest real report status.
- Asking an out-of-context question while pending returns the short scope fallback and leaves status synchronization uninterrupted.

### 18.2 Reporting

- Tapping an existing incident type starts/continues a draft without a DeepSeek call.
- A free-text “there is a fire” message maps only to `Fire Emergency` and `EMERGENCY` after validation.
- A message with fire, location wording, three people, and an unconscious victim fills all safe non-location slots together and asks only for missing deterministic fields.
- A patient-transport request maps to `Medical Emergency` plus `NON-EMERGENCY`; no Patient Transport enum is created.
- An unclear incident remains `Unknown Cause` or requests clarification; the model never invents a seventh type.
- Filipino, English, and Taglish messages receive a matching approved response style.

### 18.3 Exact People Count

- Entering `3` and Send records exactly 3.
- Entering `tatlo` while the count question is active can normalize to 3 and is echoed for confirmation.
- Entering `2-5`, `more than 10`, `0`, a decimal, or a value above 999 does not advance.
- Review and submitted payload contain the exact integer, never a range.

### 18.4 Progress

- Opening the chatbot and asking a knowledge question shows no report stepper.
- Confirming report intent begins the intake stepper.
- Failed submission does not show report-received status.
- Successful server creation starts the report-status timeline using real returned data.
- Dispatch progress changes only from real incident status.
- Pending-status Q&A never starts another intake stepper or changes submitted report data.

### 18.5 Duplicate Prevention

- Repeated taps during one submission create one in-flight request.
- Retrying the same chatbot draft with its stable submission ID returns the original created report and does not call dispatch again.
- Reopening the chatbot with an unresolved locally/scoped report restores pending or active status rather than offering a second report.
- A separate witness with a different submission ID can still report the same event; current nearby-duplicate screening routes it to PACC review.
- PACC can merge confirmed duplicate witness reports into the current primary incident without a second operational response.

### 18.6 Cancellation

- Cancel Draft clears an unsubmitted chatbot draft after confirmation and performs no report API call.
- Dismissing Cancel Draft preserves every field.
- A chatbot-origin registered pending report can call the existing authenticated cancellation path.
- A chatbot-origin guest pending report can be cancelled only with its matching scoped token.
- A verified, assigned, dispatched, duplicate, rejected, or otherwise locked report cannot be cancelled from the chatbot.
- Direct HELP reports do not gain new chatbot-only cancellation UI.

### 18.7 Failure and Regression

- With DeepSeek unavailable, selection-based reporting still completes through the existing intake APIs.
- A malformed model result cannot change report state.
- The mobile bundle contains no DeepSeek secret.
- Direct resident HELP, guest limits, evidence validation, PACC queues, dispatch, tracking, responder workflows, and report exports behave as before.

## 19. Test Plan

### 19.1 Unit Tests

- Knowledge catalog parsing and unique IDs.
- Deterministic candidate retrieval.
- Approved reply selection and out-of-scope fallback.
- Structured model result Zod validation.
- Existing incident-type allowlist mapping.
- Non-emergency medical mapping without new enums.
- Exact people-count normalization, including Filipino number words and range rejection.
- Pending-slot selection and correction semantics.
- Progress lifecycle derivation.
- Cancellation eligibility derivation.
- Stable submission-ID creation, reuse, and replay semantics.
- Pending-report chat policy: answer/fallback allowed, report mutation/new intake denied.
- Prompt construction excludes sensitive fields.

### 19.2 API Tests

- Guest and registered chatbot-response validation.
- Registered auth/role/verification checks.
- Guest and registered rate limits.
- DeepSeek success, empty JSON, malformed JSON, timeout, 429, 500, and 503 handling.
- Provider result allowlist rejection.
- Same submission-ID replay returns the existing report and never invokes dispatch twice.
- Active-report preflight prevents a second chatbot submission path.
- Guest cancellation token mismatch, missing token, wrong report, non-pending state, and active incident conflict.
- Registered cancellation ownership and state checks.
- Consistent error response shapes.

### 19.3 Mobile Component and State Tests

- Idle Q&A has no stepper.
- Draft activation starts stepper.
- Select and composer paths update the same state machine.
- Multiple extracted slots skip completed questions.
- FAQ during report resumes the pending slot.
- FAQ while submitted-pending keeps status visible and does not unlock report editing.
- Numeric Send and validation behavior.
- Review Edit round trip.
- Draft cancellation confirmation and cleanup.
- Submission loading lock and duplicate-tap protection.
- Provider fallback preserves deterministic controls.

### 19.4 End-to-End Manual Matrix

- Guest: selection-only successful report.
- Guest: free-text plus selections successful report.
- Guest: cancel draft.
- Guest: submit then cancel while pending.
- Guest: submit, ask an approved general question while pending, and receive a status reminder.
- Guest: retry after a lost submission response and recover the same report reference.
- Guest: cancellation denied after incident creation.
- Registered: verified phone is not asked or sent to DeepSeek.
- Registered: unresolved report is restored instead of allowing a duplicate report.
- Registered: optional landmark.
- Registered: existing direct HELP path unchanged.
- Filipino, English, and Taglish runs.
- Outside-Baliwag GPS warning and PACC review behavior.
- Offline/provider-unavailable fallback.
- PACC receipt, classification, manual review, dispatch, and tracking regression.

### 19.5 Repository Verification

- Root TypeScript check.
- Mobile TypeScript check.
- Focused API/unit tests.
- Production Next.js build.
- `git diff --check`.
- Secret scan confirming no DeepSeek key is present in tracked or bundled client files.

## 20. Implementation Tasks

### Task 1: Freeze the Chatbot Domain Contract

**Description:** Create shared, reviewed constants/contracts for existing incident types, normalized condition keys, report slots, lifecycle states, approved actions, and reply keys before UI or provider work.

**Acceptance criteria:**

- Only the current six incident types are representable.
- The exact people-count contract is `1-999` and rejects ranges.
- Report lifecycle and progress rules are explicit and testable.

**Verification:** Contract unit tests and root/mobile TypeScript checks.

**Dependencies:** None.

**Files likely touched:** `lib/chatbot/contracts.ts`, a mobile mirror/shared contract location, focused tests.

**Estimated scope:** Medium.

### Task 2: Normalize and Review the Knowledge Catalog

**Description:** Convert approved sections of `chatbotContext.md` into a compact runtime catalog with stable IDs, canonical answers, synonyms, language hints, and verification metadata. Exclude proposals, contradictory outside-context examples, and unverified real-time facts.

**Acceptance criteria:**

- Every answerable intent maps to one reviewed canonical answer.
- Unsupported questions have no catalog entry and use fallback.
- Expiring local contact information is sourced from a verified system value or marked unavailable.

**Verification:** Catalog validation tests for unique IDs, required fields, and forbidden/unverified entries.

**Dependencies:** Task 1.

**Files likely touched:** `lib/chatbot/knowledge-catalog.ts`, knowledge fixtures/tests, documentation source notes.

**Estimated scope:** Medium.

### Task 3: Build Deterministic Retrieval and Conversation Policy

**Description:** Implement exact/keyword candidate retrieval, fallback selection, active-report resume rules, slot ordering, correction rules, and mappings from scenes to current system fields.

**Acceptance criteria:**

- Exact known questions avoid model calls.
- Out-of-context input always resolves to an approved fallback.
- Active reports resume the last unresolved slot after a contextual answer.

**Verification:** Table-driven tests using representative examples from both supplied Markdown files.

**Dependencies:** Tasks 1-2.

**Files likely touched:** `lib/chatbot/retrieval.ts`, `lib/chatbot/policy.ts`, focused tests.

**Estimated scope:** Medium.

### Checkpoint A: Grounding Foundation

- All current types and slots are frozen.
- The runtime knowledge set has human-reviewable canonical answers.
- Known, unknown, and active-report fallback tests pass without DeepSeek.
- Review the catalog before provider integration.

### Task 4: Add the Server-Only DeepSeek Gateway

**Description:** Add a small server-only provider module using the official API/model, stable cached prompt prefix, JSON output, thinking disabled, timeout, one malformed-response retry, usage parsing, and sanitized errors.

**Acceptance criteria:**

- The key is read only from server environment.
- Requests exclude sensitive report fields and use `deepseek-v4-flash`.
- Empty, malformed, throttled, and unavailable responses degrade safely.

**Verification:** Mocked provider tests and a local configuration smoke test that never prints the secret.

**Dependencies:** Tasks 1-3.

**Files likely touched:** `lib/chatbot/deepseek.ts`, `lib/chatbot/prompt.ts`, focused tests, environment example documentation if one exists.

**Estimated scope:** Medium.

### Task 5: Add the Chatbot Interpretation Route

**Description:** Create the Next.js route that validates guest/registered input, applies deterministic policy first, calls DeepSeek only when required, validates the result, and returns canonical replies plus safe slot updates.

**Acceptance criteria:**

- Route never creates, cancels, verifies, or dispatches a report.
- Registered and guest abuse controls are enforced.
- Response remains usable when DeepSeek fails.

**Verification:** API tests for auth, validation, rate limits, deterministic bypass, model success, and fallback.

**Dependencies:** Task 4.

**Files likely touched:** `app/api/chatbot/respond/route.ts`, route helper/rate-limit module, route tests.

**Estimated scope:** Medium.

### Task 6: Introduce the Chatbot Draft State Machine

**Description:** Replace ad hoc step-index state with a typed local chatbot lifecycle, messages, slots, pending question, progress derivation, edit target, and request locks. Keep final emergency report state compatible with the current store.

**Acceptance criteria:**

- Idle Q&A and active report draft are distinct.
- Multi-slot updates, corrections, edits, and cancellation are deterministic.
- Existing submission payload can be produced without a database change.

**Verification:** Store/state-machine unit tests and mobile TypeScript check.

**Dependencies:** Task 1.

**Files likely touched:** `mobile/store/use-chatbot-store.ts` or an equivalent focused store, `mobile/store/use-emergency-report-store.ts`, focused tests.

**Estimated scope:** Medium.

### Checkpoint B: Safe Interpretation Boundary

- Provider key is server-only.
- Interpretation route cannot mutate operational state.
- Structured outputs pass allowlist validation.
- Selection-driven fallback works with the provider disabled.

### Task 7: Rebuild the Chat Shell in the DisasTRACE Palette

**Description:** Apply the reference layout pattern using the project palette: assistant header, contextual messages, selector cards, sticky composer, loading states, safe areas, and accessible controls. Hide report progress in idle mode.

**Acceptance criteria:**

- Navy/blue is the dominant interaction palette; red is not the chatbot theme.
- Composer and selections operate in one conversation.
- No inactive microphone or generic attachment behavior is presented.

**Verification:** Manual Android viewport/keyboard review, accessibility labels, snapshot/component checks where available.

**Dependencies:** Task 6.

**Files likely touched:** `mobile/app/help/chatbot.tsx`, small focused components under `mobile/components/chatbot/`.

**Estimated scope:** Medium per component slice; split shell, message list, and composer if needed.

### Task 8: Implement Dynamic Guided Intake and Exact Count

**Description:** Connect typed/free-text interpretation and deterministic selectors to the draft state machine. Implement the exact people-count numeric composer, range rejection, number-word normalization, multi-slot filling, and condition/type selection using current values.

**Acceptance criteria:**

- No people-count range selector exists.
- Existing six types are the only type choices/payload values.
- Already answered fields are skipped and corrections replace only their target.

**Verification:** Mobile state/component tests plus scene-driven manual tests in three language styles.

**Dependencies:** Tasks 5-7.

**Files likely touched:** chatbot screen/components, mobile chatbot API service, state normalizers/tests.

**Estimated scope:** Medium; split exact count from general slot flow if it exceeds five files.

### Task 9: Integrate Evidence, GPS, Guest Contact, and Review

**Description:** Reuse current camera, automatic location, guest phone, Baliwag warning, and validation behavior inside the new conversation. Add a review summary with deterministic Edit actions.

**Acceptance criteria:**

- GPS and evidence remain mandatory.
- Guest contact/landmark and registered profile rules remain unchanged.
- Sensitive deterministic fields are never sent to DeepSeek.

**Verification:** Permission-denial, upload, invalid phone, outside-service-area, and edit-flow manual tests.

**Dependencies:** Task 8.

**Files likely touched:** chatbot screen/components, existing storage/API service wrappers, review component.

**Estimated scope:** Medium; implement evidence/location and review as separate slices if needed.

### Task 10: Connect Idempotent Submission and Real Status Progress

**Description:** Build the final payload only after explicit confirmation, reuse a stable chatbot submission ID across retries, call the existing evidence/intake routes, recover the original result on replay, preserve the draft on failure, and start the status timeline only after successful server creation.

**Acceptance criteria:**

- No model response can submit a report.
- Retrying the same draft cannot insert or dispatch twice.
- Failed submission leaves Review intact and shows no report-received progress.
- Success uses real request/incident/status data and current routing.

**Verification:** Guest/registered integration tests, duplicate-tap test, API-failure test, PACC/dispatch regression.

**Dependencies:** Task 9.

**Files likely touched:** chatbot submission service/screen, current emergency report store, chatbot-origin status presentation.

**Estimated scope:** Medium.

### Checkpoint C: Complete Report Path

- Guest and registered reports submit end to end.
- Direct HELP remains unchanged.
- Exact count is persisted.
- PACC receives current incident types and existing triage metadata.
- Status begins only from a real server-created report.

### Task 11: Add Draft Cancellation

**Description:** Add Cancel Draft confirmation for active unsubmitted chatbot reports and clear only chatbot-local state on confirmation.

**Acceptance criteria:**

- No API call occurs for an unsubmitted draft.
- Cancel dismissal retains every field.
- Confirmation returns to idle assistant mode with no progress stepper.

**Verification:** State/component tests and Android back/exit manual checks.

**Dependencies:** Tasks 6-9.

**Files likely touched:** chatbot screen, chatbot store, cancellation dialog component/tests.

**Estimated scope:** Small.

### Task 12: Add Scoped Submitted-Report Cancellation

**Description:** Expose cancellation only for chatbot-origin eligible reports. Reuse registered ownership checks and add token-scoped guest parity without touching dispatch cancellation.

**Acceptance criteria:**

- Pending ownership/token and state are revalidated server-side.
- Active/locked reports return a controlled conflict and show Call PACC.
- Direct HELP reports do not gain this chatbot-only UI.

**Verification:** API tests for registered/guest authorization and race conditions; manual pending-versus-dispatched checks.

**Dependencies:** Task 10.

**Files likely touched:** current registered cancel route or a focused helper, `app/api/emergency-intake/cancel/route.ts`, chatbot-origin pending/status UI, tests.

**Estimated scope:** Medium.

### Task 13: Add Context Q&A During Draft and Pending Reports

**Description:** Enable approved questions without losing a report draft, then restore the exact pending slot; also keep approved Q&A available after submission while the real report is pending, without unlocking edits or a second report. Ensure out-of-context questions never receive general-model answers.

**Acceptance criteria:**

- Draft slots survive contextual questions.
- Approved answers render canonically.
- Unsupported questions use fallback and resume reporting.
- Submitted-pending answers keep the live status visible, do not pause status synchronization, and cannot mutate or resubmit the report.

**Verification:** Conversation-policy and mobile integration tests using fallback cases from `chatbotContext.md`.

**Dependencies:** Tasks 3, 5, and 8.

**Files likely touched:** chatbot policy/service, mobile conversation controller, focused tests.

**Estimated scope:** Medium.

### Task 14: Security, Cost, and Regression Hardening

**Description:** Complete sensitive-data checks, rate limits, timeout behavior, usage metrics, cache-prefix stability checks, accessibility review, and full-system regression.

**Acceptance criteria:**

- Secret scan and client-bundle review find no DeepSeek key.
- Metrics contain no raw messages or incident-sensitive fields.
- Existing direct reporting, PACC, dispatch, tracking, and responder flows pass regression.

**Verification:** Full test plan in Section 19, production build, mobile typecheck, and `git diff --check`.

**Dependencies:** Tasks 1-13.

**Files likely touched:** tests, sanitized observability helpers, context/progress documentation.

**Estimated scope:** Medium.

### Checkpoint D: Release Readiness

- All acceptance scenarios pass.
- Human review confirms the runtime knowledge catalog.
- Human review confirms exact count and cancellation behavior.
- DeepSeek key is present only in server/deployment configuration.
- Provider-disabled fallback has been demonstrated.
- No new database incident type exists.
- Existing system regression checks pass.

## 21. Dependency Order

```text
Domain contract
  -> Knowledge catalog
    -> Retrieval/policy
      -> DeepSeek gateway
        -> Interpretation API

Domain contract
  -> Mobile state machine
    -> Chat shell
      -> Dynamic intake
        -> Evidence/GPS/contact/review
          -> Existing intake submission
            -> Status progress
              -> Submitted cancellation

Retrieval/policy + interpretation API + dynamic intake
  -> In-report contextual Q&A

All paths
  -> Security/cost/regression hardening
```

Provider and mobile foundation tasks may proceed in parallel only after the domain contract is frozen. Submission, status, and cancellation are sequential because they share operational lifecycle rules.

## 22. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Model answers from general knowledge | High | Model selects only allowlisted IDs/actions; canonical local answer rendering; deterministic fallback. |
| API key exposed in Expo | High | Server-only route/module and non-public server env variable; client bundle/secret scan. |
| AI changes incident type or submits a report | High | Existing enum allowlist, Zod validation, deterministic state machine, explicit user submit, existing intake revalidation. |
| Current scenario file conflicts with schema | High | Apply reconciliation table and current-contract precedence. |
| DeepSeek latency blocks emergency reporting | High | Selection-first UI, timeout, one retry only, deterministic fallback. |
| Token cost grows with conversation length | Medium | Candidate retrieval, compact state, stable prefix caching, no full transcript/context, no calls for deterministic interactions. |
| Guest chatbot spam consumes provider balance | High | Guest IP/device rate limits, message length cap, deterministic bypass, existing daily report limit remains separate. |
| Sensitive incident data reaches provider | High | Explicit data-minimization allowlist and tests for prompt construction. |
| Cancellation races with dispatch | High | Server recheck at mutation time; active incident locks cancellation; controlled conflict and Call PACC fallback. |
| Lost responses or repeated taps create duplicate reports/dispatches | High | Single-flight UI, stable per-draft submission ID, idempotent server replay, active-report restoration, and existing nearby-duplicate/PACC merge controls. |
| Pending Q&A hides or stalls operational status | High | Keep status synchronization independent of model calls, keep the status card visible, and always let latest server state win. |
| Redesign changes direct HELP behavior | High | Chatbot-origin state/route gating and dedicated regression tests. |
| Progress implies work before persistence | Medium | Separate intake and post-submission indicators; status starts only after successful API response. |
| Knowledge values become outdated | Medium | Verification metadata and system-backed contacts; unavailable fallback rather than guessing. |

## 23. Definition of Done

The feature is complete only when:

- The chatbot answers exclusively from the approved local context.
- Free text and selections share one validated report state machine.
- Exact people count is typed/sent and stored as one integer.
- Only current incident types reach the database.
- DeepSeek runs server-side as a constrained interpreter using `deepseek-v4-flash`.
- Provider failure falls back to a fully usable selection-based intake.
- Intake progress starts only with an actual draft.
- Report status starts only after successful report creation.
- A retry of the same chatbot draft returns one report and can never start dispatch twice.
- Separate witness reports continue through current probable-duplicate screening and PACC merge rather than being silently discarded.
- Approved general questions remain available while a chatbot-origin report is pending, with immutable submitted fields and uninterrupted live status.
- Draft and eligible submitted-report cancellation work with correct authorization and locking.
- Direct HELP and all existing operational workflows remain unchanged.
- Security, test, build, and human knowledge-review gates pass.

## 24. Implementation Prerequisites

Before coding begins:

1. Review and approve this plan.
2. Confirm the reviewed runtime subset of `chatbotContext.md`; do not treat proposed directory items as verified facts.
3. Move/copy the already configured DeepSeek secret into the Next.js server/deployment environment using a non-public variable without exposing its value.
4. Treat chatbot-origin submitted guest reports as having token-scoped cancellation parity while pending, as specified here.
5. Capture baseline guest, registered chatbot, direct HELP, PACC, and dispatch test results for regression comparison.

## 25. Reference Documentation

- Local Next.js 16 Route Handlers guide: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Local Next.js 16 environment variables guide: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- Local Next.js 16 server/client boundary guide: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- DeepSeek first API call and current model IDs: `https://api-docs.deepseek.com/`
- DeepSeek Chat Completions API: `https://api-docs.deepseek.com/api/create-chat-completion/`
- DeepSeek JSON output: `https://api-docs.deepseek.com/guides/json_mode/`
- DeepSeek context caching: `https://api-docs.deepseek.com/guides/kv_cache/`
- DeepSeek rate limits and `user_id` isolation: `https://api-docs.deepseek.com/quick_start/rate_limit`

## 26. Implementation Record (2026-09-02)

Delivered:

- Server-side contracts, deterministic multilingual policy, compact reviewed knowledge catalog, response endpoint, privacy filter, rate limits, and a server-only DeepSeek V4 Flash candidate selector. Canonical local text remains the only rendered knowledge answer.
- A key-free, injectable DeepSeek gateway core with a stable cacheable prompt prefix, strict structured output, disabled thinking, usage accounting, a five-second timeout, one retry for malformed/empty/429/5xx results, and controlled provider-disabled fallback.
- Navy/blue chat-and-select mobile intake with inferred-intent confirmation, actor-scoped SecureStore restoration, exact typed/corrected people counts, draft-only adaptive five-phase progress, evidence/GPS/contact validation, outside-Baliwag warning, review edits, and draft discard confirmation.
- A dedicated locked chatbot pending experience with independent report-status polling, approved Q&A plus the latest status reminder, Track/Return Home commands, real terminal transitions, and no submitted-field mutation or second intake path.
- Stable chatbot submission ID replay at the existing intake boundary, serialized cancellation/dispatch transitions, token-scoped guest cancellation, and a dedicated ownership-scoped registered chatbot cancellation route. The existing direct HELP cancellation endpoint and UI remain separate.
- No new incident type and no database migration.

Automated verification passed:

- `npx tsx scripts/verify-chatbot-contract.ts`
- `npx tsx scripts/verify-chatbot-mobile-state.ts`
- `npx tsx scripts/verify-deepseek-gateway.ts`
- Root and mobile `npx tsc --noEmit`
- Root and mobile touched-file ESLint checks
- `git diff --check`
- Tracked/client secret scans
- `npm run build` (Next.js production build; the environment used the WASM SWC fallback because its installed native Windows SWC binary was invalid)

Remaining connected release validation:

- Run the Android viewport, keyboard, evidence, GPS-permission, edit, back-navigation, and cancellation matrix on a device/emulator.
- Run guest, approved-resident, PACC merge/review, dispatch, responder, tracking, lost-response replay, and locked-cancellation scenarios against the configured database and role accounts.

Deployment prerequisite:

- Confirm `DEEPSEEK_API_KEY` (or the supported legacy `DEEPSEEK_API`) in the Next.js deployment environment. The Expo client does not read this secret, and no secret value is stored in tracked or client source files.
