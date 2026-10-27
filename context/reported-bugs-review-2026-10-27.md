# Reported mobile and administrative issues: review and implementation recommendations

Reviewed 2026-10-27 against local commit `12cb0c7` and the four supplied screenshots. This is a source review and implementation proposal. No runtime code, database records, approvals, broadcasts, or deployment configuration were changed.

## Assessment

| Report | Assessment of current source | Priority |
| --- | --- | --- |
| Responder loses accepted response and requires restart | Confirmed unsafe local cleanup and delayed-write paths. The exact incident in the screenshot still needs request/state evidence to establish its cause. | P1: operational reliability |
| Registration rejection always shows the same reason | Confirmed mismatch between the persisted reason and the mobile data source. | P1: blocked onboarding |
| Rejected applicant can only replace ID | Confirmed UI limitation; name changes are deliberately forbidden by the general mobile profile API. | P2: correction workflow |
| Announcements absent for residents/responders | Current source includes persistent inbox delivery and both-role push registration. Actual delivery failure is not established by source inspection; delivery diagnostics and device acceptance are required. There is an additional confirmed partial-success handling gap. | P1 investigation; P2 resilience |
| OTP disappears under keyboard | Keyboard avoidance already exists in the modal; recurrence on the current build needs Android reproduction. | P2 |
| Whole responder app flickers | Several mitigations already exist. No native reproduction was performed, so no single root cause is established. | P2; raise to P1 if controls become unusable |
| Every account is “Active recently” | Confirmed fabricated activity projection from a non-null profile-update timestamp. | P2 |

P1 means address before operational release. These priorities do not imply that the screenshots came from the reviewed commit: the installed APK and deployed API versions were not supplied or verified.

## 1. Responder assignment disappearance and duty recovery

### Confirmed defects and relevant protections

- `mobile/hooks/use-offline-reports.ts:101` handles an old queued `INCIDENT_REASSIGNED` response by calling `completeIncident()` without the queued incident ID. The store defaults to the *current* active incident. A rejected action for incident A can therefore clear a newer incident B.
- The same unscoped cleanup exists in `mobile/stores/useResponderStore.ts:335`, `:576`, and `:665` for arrival, opening a report, and deferring documentation. These operations await network work before cleanup. The report submission path already demonstrates the safer pattern, `completeIncident(idToSubmit)` at `:785`.
- `releaseDispatchOffer` at `mobile/stores/useResponderStore.ts:902` receives an incident ID in its notice but clears the active state unconditionally. A delayed release for A can discard B.
- `DispatchSheet` awaits acceptance and then calls the parameterless `acceptDispatch`. A delayed acceptance response can advance whatever dispatch is now in the store rather than the incident captured when Accept was pressed.
- The incoming listener at `mobile/components/responder/ResponderHome.tsx:454` performs multiple asynchronous lookups before installing an offer/direct dispatch, without a final cancellation/account/current-state check. Its effect cleanup removes the channel but does not cancel a callback already awaiting those lookups.
- The ownership reconciliation at `ResponderHome.tsx:692` starts a read before subscribing. A read that began before acceptance can complete after a newer realtime update. There is no response-version guard to ensure the older snapshot cannot downgrade a newer accepted state. The assigned-owner callback also lacks an upfront mounted/current-incident guard before its state write.
- Clearing local dispatch state does not refresh the separate duty store. The Auth provider updates duty on session verification or user-row realtime changes, but does not itself recheck on foreground. A missed update can leave the badge stale until another refresh/restart.
- Queue synchronization has multiple owners: Home, ResponderHome, and OfflineBanner each call `useOfflineReports`. Its replay guard at `mobile/hooks/use-offline-reports.ts:53` uses hook-local `syncing`; the shared `isSyncingQueue` value is exposed but not used as an atomic replay lock. Mounted instances can replay the same queued action concurrently. This increases the importance of incident-scoped cleanup and server idempotency.

The server already uses conditional acceptance and cascade updates: `app/api/incidents/respond/route.ts:99` claims only the current unassigned `DISPATCHED` offer; `lib/dispatch-engine.ts:409` cannot cascade an already accepted `EN_ROUTE` incident. Preserve these protections. The alert text alone does not establish that the expiry scheduler stole an accepted incident: it may concern stale local work for another incident.

### Recommended implementation

1. Make all asynchronous operational mutations capture `{ accountId, incidentId }`. Pass the captured incident ID to every cleanup path. Have the store ignore release/accept/arrival/reconciliation results for a different current incident or account.
2. Make acceptance apply the returned server incident, guarded by the captured identity. Handle “accept committed but response lost” by reconciling ownership before declaring failure or accepting a competing local state. Keep an accepted incident recoverable even if the old offer endpoint returns 409 because it is no longer an offer.
3. Route incoming realtime events through one guarded hydration path. Reuse the existing authorized offer API where appropriate instead of independently rebuilding offers from delayed multi-table reads. Keep accepted/direct assignment restoration distinct from offer hydration.
4. Add a bounded server reconciliation on foreground, realtime reconnect, and authoritative reassignment conflicts. Return the responder's current accepted incident/current offer and duty state together from a responder-scoped read. Keep previous confirmed state with a reconnecting message during network failure; an absent RLS-filtered read is not proof of reassignment.
5. Preserve database-owned expiry, reservation, ownership, transport progression, and availability. Never force `ON_DUTY` merely because the UI cleared: another live incident may still own the responder.
6. Give queue replay one approved-responder lifecycle owner and let screens/banners observe its state. Acquire any shared replay lock atomically before asynchronous work; a display boolean alone is insufficient. Keep account ownership checks and server idempotency even with one worker.

### Required regression scenarios

- While B is accepted, resolve an old queued A action with `INCIDENT_REASSIGNED`: B, its form, and telemetry remain intact.
- Deliver delayed release, acceptance, and hydration results for A after B/account change: no mutation of B or the new account.
- Start a pre-accept status read; deliver `EN_ROUTE` realtime; complete the older read: no downgrade or false expiry.
- Race Accept against server expiry using real conditional database writes: exactly one outcome wins; a committed acceptance remains assigned.
- Drop the HTTP response after acceptance commits: foreground reconciliation restores that accepted response without restart.
- Perform genuine reassignment: the old responder sees one explanation, gets the server's current duty state, and can receive the next eligible offer.
- Open/submit an older documentation draft while a new call is live; queue replay and report completion cannot clear the new call.
- Mount Home, map, and OfflineBanner together while reconnecting: one worker replays each queued operation, and retries after a lost response remain idempotent.
- Confirm PACC/CDRRMO maps, public tracking, GPS freshness requirements, and offline delivery labels still reflect the same server state.

## 2. Registration rejection reason and correction flow

### Confirmed cause

`app/api/users/approval/[id]/route.ts:39` writes the administrator's reason to `users.rejection_reason`. The rejected screen instead reads `user.app_metadata.rejection_reason` and supplies the screenshot's hard-coded identity-document explanation at `mobile/app/(verification)/rejected.tsx:129`.

The shared mobile Auth provider selects verification status and profile fields but omits `rejection_reason` (`mobile/hooks/use-auth-status.ts:67`), and its realtime projection does not publish the reason. Consequently a correct database decision can route the applicant to Rejected while showing unrelated advice. `GET /api/users/me` exposes a reason, but it is not the data source used by this screen; it also has permissive missing-profile verification fallbacks, so it should not simply be adopted as a new authoritative gate without a separate review.

### Recommended implementation

- Extend the existing account-scoped Auth projection with nullable `rejectionReason`; populate it on initial read and realtime changes, clear it on account switch and successful resubmission, and retain stale-request guards. Render that field on Rejected.
- For a missing reason, display neutral guidance such as “No rejection reason was provided. Contact CDRRMO for assistance.” Do not claim a document defect without evidence.
- Require a trimmed, bounded reason for a rejection at the server schema boundary (`types/approval.ts:32` currently permits omission). Preserve old rejected records with null reasons; do not invent historical reasons.
- Keep the current exact-document approval predicate and admin-only decision authority.

### Correcting something other than the ID

The resubmission UI at `mobile/app/(verification)/rejected.tsx:131` offers ID type/photo only. The general profile route explicitly rejects mobile name changes (`app/api/users/profile/route.ts:49`). Merely relabeling the button cannot resolve a registered-name mismatch.

Recommended first increment: show the actual reason and a supported CDRRMO correction path, retaining ID replacement for document problems. This fits the existing policy that registered mobile names cannot be self-edited. If applicant self-correction is desired, define it explicitly before implementation: a rejected-application-only correction endpoint, allow-listed fields, a new application/document revision, audit of old/new values, and mandatory review before access. Keep phone/email changes on their existing verification paths. Do not relax the general profile route for all approved mobile users.

### Additional concurrency defect to close when changing this flow

`POST /api/verification/id` checks verification status before awaiting storage upload, then updates by user ID alone (`app/api/verification/id/route.ts:115`). An admin can approve the old application during that upload; its delayed completion can reset the account to pending and replace the just-approved document. Make the final write conditional on the expected eligible account/application state or revision. Return a conflict if it changed and clean up the unused uploaded object. Keep suspended/deactivated accounts outside applicant correction eligibility.

### Acceptance

Reject with three distinct reasons, including name mismatch: each must appear verbatim after live update and cold sign-in. Test null/blank legacy reasons, reason-only updates, account switches, offline refresh, rejected responder accounts, resubmission, and approval while upload is pending. Resubmission must not grant access or erase a newer admin decision. Verify the existing pending/approved/banned gates and web approval queue still work.

## 3. Announcements missing for Public Users and Responders

### What the current code actually does

- `app/api/notifications/announcement/route.ts:105` atomically inserts a broadcast audit record and recipient inbox records before pushing.
- Audience values support All, Residents, and Responders. Accounts must be `ACTIVE`, have an Auth profile, and not opt out through either `system` or legacy `system_notices` preferences. “All” currently also includes active administrative accounts; device alerts are only possible where a matching mobile token/session exists.
- Approved Public Users and Responders share root-owned push registration with retries (`mobile/hooks/use-mobile-push-registration.ts`). Both can display `system_announcement`; the public notification filter does not hide this type.
- `lib/push-notifications.ts:64` requires a stored token bound to the current mobile session. No active token/session means no device push, while a committed inbox entry remains available.
- The provider helper records acceptance of a push request, not a handset delivery receipt. The current helper does not retain ticket IDs or retrieve receipts.

There is no source evidence that audience selection universally excludes residents or responders in the reviewed version. Do not replace the pipeline or bypass user preferences based only on these screenshots.

### Diagnostic order before changing delivery logic

1. Record the APK build, API deployment, broadcast ID, test account role/status/verification, and time. Ensure the reviewed announcement migration and code are actually deployed.
2. Check recipient accounting and that the exact recipient has an inbox row linked to that broadcast. If absent, inspect scope, account eligibility, Auth presence, preferences, and transaction errors.
3. If the inbox row exists, check the user's authenticated inbox response and mobile focus/foreground refresh. Separate saved-inbox failure from an absent Android banner.
4. If only the device alert is absent, inspect push registration state, current token/session binding, native project/FCM configuration, OS permission/channel state, and provider outcome. Use staging/test recipients rather than a production-wide diagnostic broadcast.

### Confirmed reliability gap and recommended hardening

The request waits for all push batches and then updates audit counters at `announcement/route.ts:168`. If that final update throws, the outer handler returns HTTP 500 even though the inbox transaction already committed and some pushes may already have been accepted. The dashboard preserves its composer on failure, making a manual retry capable of creating a second broadcast. Large audiences also keep the request open for multiple sequential batches.

First make post-commit delivery accounting failure report “saved; delivery status incomplete” with the original broadcast ID, and add a client-generated idempotency key enforced by the server. For durable delivery retries beyond that increment, use a persisted outbox/job processed after commit; never depend on an unawaited promise surviving a serverless response. Persist tickets/receipt outcomes only if extending delivery diagnostics, and distinguish provider acceptance from device presentation. Keep retries unique per broadcast/recipient.

Preserve existing REST audience values, opt-outs, inbox records, session binding, and emergency dispatch sound channels. Announcement changes must not suppress or delay urgent responder dispatch delivery. Treat “All Users” audience semantics as a product decision rather than silently narrowing it to the two mobile roles.

### Acceptance matrix

For All, Residents, and Responders audiences, test an eligible account of each role; verify both inclusion and exclusion. Repeat foreground, background, cold start, denied permission, offline recipient, opt-out, stale token, switched device, provider failure, final audit-update failure, and retried POST. Eligible inbox rows must survive push failure; there must be no duplicate broadcast/recipient rows on retry. Verify web history and counts, recipient inbox, and dispatch notification receipt independently.

## 4. OTP hidden by the Android keyboard

The modal already owns `KeyboardAvoidingView` and a scrollable bottom-aligned container (`mobile/components/auth/Step2.tsx:462`). Android keyboard mode is already `resize` (`mobile/app.json:16`). Previous fixes were documented on October 8 and 14. Therefore “add keyboard avoidance” is not an adequate new recommendation.

Reproduce on a current APK with the affected keyboard, Android version, screen height, navigation mode, and font scaling. Inspect the modal's actual visible viewport and focused-cell position; the parent registration scroll view cannot manage a separate native modal window.

Keep any correction local to the OTP modal: safe-area-aware bottom spacing, bounded sheet content with scrolling, and focus visibility across all six cells. Determine which native resize/avoidance mechanism is effective before adding keyboard-height padding, which could introduce double displacement. Do not globally alter every screen's keyboard configuration to repair one modal.

Test first/last digit, deletion, wrong/expired code, resend cooldown, dismiss/reopen, keyboard Back, small screens, and enlarged text. Six-digit paste/autofill is an additional improvement: current `maxLength={1}` cells and last-character extraction do not implement a complete six-digit paste flow; keep that separate from the visibility fix and retain the existing OTP validation endpoints/rate limits.

## 5. Responder flicker

The reviewed map already uses `androidView="texture"` (`ResponderHome.tsx:1088`), focused map visual work, and narrower store subscriptions. Auth has one root provider; report forms and offers are tab-shell-owned. Preserve these mitigations until device evidence identifies a specific regression.

“Whole app flicker” may involve native map/keyboard/modal composition, navigation/remounts, or repeated data-driven updates. Those are different failure mechanisms. Source inspection does not determine which happened in the supplied recording.

Record a current-build reproduction and correlate screen/map mount counts, role/auth transitions, tab/form visibility, GPS/route updates, and Android logs. A frame trace can establish whether the map surface flashes while the React tree stays mounted. Avoid logging patient details, tokens, or full operational payloads in added diagnostics.

Then make the smallest demonstrated correction: keep map and tab identities stable, avoid route replacement on routine data updates, guard delayed effects, and limit visual updates while covered. Continue tab-owned foreground/background operational telemetry while a form is open. Do not “fix” flicker by pausing dispatch subscriptions, GPS persistence, offline sync, or replacing all map components.

Device acceptance must include idle/on-duty, receipt/acceptance, scene arrival, transport, report modal and nested PCR/trip-ticket modals, keyboard entry, autosave, notification navigation, background/resume, and repeated tab switches. Inspect PACC/public tracking while responder forms are open to ensure operational updates continue.

## 6. User Management Last Active

`app/api/users/route.ts:110` sets `lastActive` to “Active recently” whenever `updatedAt` exists. The schema makes that field non-null and gives it a creation default (`db/schema/users.ts:28`). It measures profile mutation, not login or activity, and no recency calculation is performed. Thus even an untouched pending applicant appears recently active.

Recommended immediate correction: preserve account status and verification badges, but return `Unavailable` for pending/rejected/suspended/deactivated mobile accounts and `Not recorded` when an eligible account has no real activity timestamp. Do not translate unknown data to “Never.” Apply the same projection to the table and PDF export (`lib/pdf-export.ts:799`). This can preserve the existing `lastActive: string` contract and needs no database change.

For accurate elapsed times, define the signal before adding storage: `lastSignInAt` means successful authentication; `lastSeenAt` means a bounded authenticated app/web activity signal. Neither proves a person is currently online. If last-seen tracking is added, use server time, throttle writes, keep it separate from profile updates, format in Asia/Manila, and make legacy values nullable. Do not repurpose responder GPS freshness as public-user activity or call someone online merely because they have a token.

Account status, verification status, duty status, and last activity must remain separate. “Unavailable” is display text for this column; do not add an account-status enum value or change pending users to deactivated. Preserve filters, summary cards, exports, and approval-only activation.

## Implementation sequence and compatibility gates

### Added PACC completion-loop report (same-day follow-up)

The additional screenshot describes completed reports returning as unassigned PACC work, failed rejection, and incorrect responder availability after redispatch. Read-only inspection of the configured database found no current submitted-report/non-resolved-incident or pending-request/incident mismatch, so the exact historical loop was not reproduced and no data repair is justified.

Source review identified actionable risks: a pending request could remain actionable despite its linked incident lifecycle; concurrent queue fetches could install an older snapshot; orphan maintenance released responders from precomputed snapshots; report completion counted documentation-pending incidents as active reservations while overlooking newer pending offers; and an advisory notification failure could return failure after report completion committed. The implementation now excludes accepted/completed work from triage, independently blocks rejection/redispatch of submitted final reports, versions queue reads, shares a row-locked availability release across completion/expiry/maintenance, and keeps committed report submission successful if its notification fails. Isolated tests execute the actual handlers, with in-memory IO, including old drafts, newer offers, repeated completion, and post-commit notification failure. Physical-device/staging lifecycle acceptance remains required.

Deliver independent, reviewable increments:

1. Incident-scoped responder mutations and recovery, with delayed-result and database acceptance/expiry tests.
2. Database-backed rejection reason and truthful applicant guidance; conditional resubmission writes. Keep any new self-correction capability as an explicitly defined follow-up.
3. Truthful Last Active projection across the users API, table, and PDF.
4. Staging announcement diagnosis; post-commit/idempotency hardening based on the failure points above. Introduce durable delivery work separately if needed.
5. Device-proven OTP and rendering corrections as separate mobile changes.

At each increment, update `context/progress-tracker.md` with actual results. Update architecture/scope documents before introducing a new correction policy, activity-storage model, recovery endpoint, or delivery worker.

| Boundary | Preserve | Evidence required before release |
| --- | --- | --- |
| Shared authentication | Role checks, verification bans, one-device mobile session, web-admin session independence | Pending/approved/rejected/banned cases; account/device switching; web login and renewal |
| Dispatch | Conditional server ownership, offer deadlines, no local availability override | Acceptance/expiry concurrency; old A response after new B; PACC/manual/automatic flows |
| Public reporting | Registered/guest ownership, scene-arrival privacy boundary | New report, tracking, arrival, terminal cleanup, no hospital telemetry exposed |
| Responder documentation | Draft identity, offline queue owner, transport prerequisites | Older draft plus newer response; disconnect/replay; PCR/trip-ticket completion |
| Announcements | Stable audience values, opt-outs, inbox authority, independent emergency alerts | Audience matrix and fault injection; actual Android receipt; web counts/history |
| Web administration | Exact-document approval, unchanged status/filter values, PDF parity | Decision conflicts, users filters/summary, exports, PACC/CDRRMO map state |
| Version compatibility | Existing payload fields and older installed clients | Additive API fields, old/new client smoke tests; explicit minimum build if required |

Do not combine dependency upgrades, global navigation rewrites, and database lifecycle changes with these fixes. Apply any additive migration before deploying a client that requires it. Do not claim zero regression risk: use the concrete checks above to bound it, then release incrementally with a rollback path.

## Validation performed for this review

Passed web and mobile TypeScript checks (`tsc --noEmit`) and these eight existing scripts:

- `verify-announcement-delivery.ts`
- `verify-user-approval-lifecycle.ts`
- `verify-dispatch-recovery.ts`
- `verify-responder-duty-availability.ts`
- `verify-testing25-lifecycle.ts`
- `verify-public-mobile-reliability.ts`
- `verify-responder-report-reliability.ts`
- `verify-responder-draft-form-session.ts`

The announcement/OTP/lifecycle coverage includes source-text assertions; dispatch policy and approval checks also exercise pure business rules. These passes do not execute native keyboard/map rendering, prove provider-to-device delivery, or exercise real concurrent database acceptance/cascade transactions. They do not cover the delayed A-result-clears-B defect identified here.

No physical-device reproduction, database/deployment inspection, live broadcasts, production data mutation, new build, or deployment was performed. Reuse `context/testing-25-acceptance.md` and extend it with the incident-race, rejection-reason/correction, and truthful-activity cases in this review. Only this review document was intentionally added.
