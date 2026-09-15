# Rejected Report Workflow — TDD Evidence

Date: 2026-09-15

## Scope

- Keep rejected reports out of active PACC work while retaining a distinct rejected archive.
- Distinguish PACC rejection from a responder-completed Case Closed report.
- Require, persist, and return PACC's rejection reason to the owning registered reporter or token-scoped guest.
- Clear terminal mobile state so either reporter type can start another report.

## RED

- `npx tsx scripts/verify-rejected-report-workflow.ts` initially failed with `MODULE_NOT_FOUND` for the planned rejection workflow contract.
- `npx tsx scripts/verify-chatbot-mobile-state.ts` initially restored a persisted rejected report as `SUBMITTED_PENDING`; the expected lifecycle was `IDLE`.

These failures demonstrated that neither the shared terminal classification nor restart recovery behavior existed before implementation.

## GREEN

- `npx tsx scripts/verify-rejected-report-workflow.ts` — 6 behavior groups passed for active/archive classification, Case Closed separation, required reason normalization, exact public feedback, and guest/registered recovery routes.
- `npx tsx scripts/verify-chatbot-mobile-state.ts` — 12 checks passed, including rejected persisted state restoring to idle.
- `npx tsx scripts/verify-chatbot-contract.ts` — 29 contract checks passed.
- `npx tsx scripts/verify-dispatch-recovery.ts` — 7 dispatch safety checks passed.
- Web and mobile `npx tsc --noEmit` passed.
- Database migration audit passed after applying migration `0020_remarkable_bushwacker.sql`.
- `npm run build` completed the Next.js 16 production build successfully.
- `npx expo export --platform android` bundled all 4,796 mobile modules successfully.

## Refactor and review

- Centralized atomic database rejection in `lib/reject-verification-request.ts`.
- Centralized terminal classification/status projection in `lib/rejected-report-workflow.ts`.
- Centralized guest/registered mobile reset and recovery actions in `mobile/hooks/use-rejected-report-recovery.ts`.
- Security review confirmed PACC-only mutation, reporter/token-scoped reason reads, parameterized queries, and rejection guards for active or resolved incidents.
