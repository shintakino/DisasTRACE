# Panel QA Hardening — TDD Evidence

Date: 2026-09-16

## Scope

- Keep verification reads responsive while responder-offer expiry and backlog recovery run in the background.
- Preserve rejected, duplicate, waiting, and Case Closed as distinct operational outcomes.
- Record the real PACC actor and structured action details without guessed identities.
- Require readable, versioned Data Privacy consent during registered-user signup.
- Preserve truthful guest and registered-report recovery across weak networks and restarts.
- Provide a bounded historical demand outlook from verified incidents without presenting it as an official warning or automated prediction.

## RED

- `npx tsx scripts/verify-panel-qa-hardening.ts` initially failed because `lib/incident-demand-outlook.ts` did not exist.
- The failing contract was written before implementation and covered completed-bucket zero filling, minimum sample size, verified-only demand inputs, read-only queue behavior, scheduler maintenance results, audit authorization/details, terminal-action guards, signup consent metadata, and the guest submission commit boundary.
- `npx tsx scripts/verify-guest-allowance-visibility.ts` initially failed with `MODULE_NOT_FOUND` for the planned shared Guest Mode allowance contract.

## GREEN

- `npx tsx scripts/verify-panel-qa-hardening.ts` — passed.
- `npx tsx scripts/verify-dispatch-recovery.ts` — all dispatch recovery checks passed.
- `npx tsx scripts/verify-rejected-report-workflow.ts` — all seven rejection, Case Closed, reason, and resubmission checks passed.
- `npx tsx scripts/verify-chatbot-mobile-state.ts` — all twelve persistence and recovery checks passed.
- PACC priority, verification queue, mobile status feedback, major-action feedback, and operational-priority regression scripts passed.
- `npx tsx scripts/verify-guest-allowance-visibility.ts` — pending, active response, resolution, and history visibility checks passed, including singular/plural/exhausted copy.
- Web and mobile TypeScript checks passed.
- Targeted web and mobile ESLint completed with zero errors; remaining messages are existing hook/compiler advisory warnings.
- The database migration audit passed with 28 canonical migrations applied and no missing required tables, columns, indexes, triggers, or constraints.
- `npm run build` completed the Next.js 16 production build successfully.
- `npx expo export --platform android` bundled all 4,802 mobile modules successfully.
- `git diff --check` passed; Git only reported line-ending normalization notices.

## Refactor and security review

- Dispatch maintenance now runs only through the protected scheduler; PACC queue reads authenticate before a read-only query.
- Audit feeds require CDRRMO Super Admin, retain immutable actor snapshots, and route-owned PACC actions write their audit event in the same transaction as the state change.
- Guest access tokens remain header-scoped, registered status recovery remains owner-scoped, and terminal mutation routes reject stale report states.
- Forecasting uses aggregate verified incident history, excludes the incomplete current bucket, enforces a minimum sample, and explicitly states that the result is planning context rather than a warning.
- The repository has no configured statement/branch coverage runner, so coverage is evidenced by focused behavioral contract scripts rather than a numeric percentage.
