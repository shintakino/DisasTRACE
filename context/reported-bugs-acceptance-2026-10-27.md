# Reported bug release acceptance

Deploy the web/API changes before distributing the new Android build: the new shell-owned dispatch lifecycle reads `/api/responder/state`. Existing clients retain their existing endpoints; the announcement idempotency identifier is optional. No schema migration is required.

Record the actual web revision, APK build, device/Android/keyboard versions, and test time. Use staging/test accounts and recipients. Do not send a diagnostic broadcast to production users.

| Area | Required check | Expected result |
| --- | --- | --- |
| OTP | Small Android screen; OEM/Gboard numeric keyboard; enlarged text; keyboard Back; reopen | All digits remain reachable above either an overlay or resized keyboard; no double displacement. |
| OTP requests | Paste/autofill six digits, delete, expired/wrong code, resend, dismiss during request | Numeric code distributes correctly; old requests cannot advance a dismissed attempt. |
| Rejection reason | Admin rejects with distinct document/name reasons, then applicant cold sign-in and foreground refresh | Exact current database reason; neutral missing-reason fallback. |
| Correction | Rejected applicant opens correction request, sends support message, returns | CDRRMO support receives the account-linked request; applicant gains no approved app access. |
| ID race | Delay ID upload; approve, reject again, replace ID, or suspend before it saves | Conflict preserves the newer decision/document, and unused upload is removed. |
| Dispatch races | A's delayed success/failure arrives after B; switch accounts mid-request | B and the new account's form, duty and telemetry survive. |
| Lost acceptance | Drop the response after acceptance commits; background/resume and reconnect | Server-owned accepted response recovers without restart or false expiry. |
| Cross-tab dispatch | Receive offers while Home, Reports, Forms and Profile are active | One urgent overlay; a documentation draft stays incident-bound and recoverable. |
| Availability | Complete A with an older documentation draft, or while B has a pending offer | Older draft does not reserve operational duty; B remains reserved. |
| Maintenance race | Delay orphan/expiry cleanup while another offer commits | Locked fresh ownership check prevents cleanup releasing the newer offer. |
| PACC completion loop | Submit final report; retry completion; refresh/reopen PACC; attempt stale rejection/dispatch | One submitted report and resolved incident; Case Closed, no new offer, clear conflict feedback. |
| PACC fetch race | Delay initial/silent queue response across completion and a newer refresh | The older snapshot cannot restore the actionable card. |
| Post-commit failures | Fail report notification or announcement audit update after commit | Saved report/announcement remains successful; retry does not duplicate it. |
| Announcements | All/Residents/Responders; opt-outs; permissions denied; old device session; foreground/background | Correct saved inbox audience, truthful push setup/outcomes, no suppression of emergency sounds. |
| Announcement retries | Lose HTTP response, retry same content concurrently and after reload | Same broadcast/recipient entries; no second push attempt for the same broadcast identity. |
| Flicker | Idle, dispatch, arrival, transport, main/PCR/trip-ticket modals, keyboard, tabs, resume | Stable native map/camera and modal composition; operational telemetry continues while covered. |
| User activity | Pending/rejected/suspended and approved accounts; PDF export | Unavailable or Not recorded as appropriate; no fabricated activity or status/filter changes. |
| Shared regression | Public/guest report creation and scene-arrival tracking; admin map/roster; account gates | Existing ownership/privacy boundaries, tracking completion, drafts and administrative operations remain correct. |

Automated checks execute actual store/route logic with native/database IO isolated, plus existing business-policy, navigation, type, lint and bundle/build checks. They do not prove real PostgreSQL scheduling, physical Android rendering, or handset push receipt. No Android device was connected during implementation. Read-only diagnostics are available in `scripts/inspect-announcement-readiness.ts` and `scripts/inspect-pacc-lifecycle.ts`; they print operational aggregates without tokens or patient/message content.

Implementation verification on 2026-10-27: `node scripts/verify-reported-bugs.mjs` passed all 31 scripts; web/mobile TypeScript, production Next.js build, and final Android Expo export passed. Targeted lint had zero errors and retained existing warnings. The database was inspected read-only, with no lifecycle backfill or live broadcast. These checks are development verification; the device/staging rows above remain release acceptance tasks.
