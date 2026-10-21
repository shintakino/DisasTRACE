# Testing 25 release acceptance

These checks require a new Android build containing the current changes and the updated web deployment. A successful bundle/typecheck is not evidence of crash-free native execution. Do not retest an older installed APK and assume it contains these changes.

Record APK version/build, device model, Android version, role, and reproduction time. Use test accounts; do not send a broadcast to production residents just to validate delivery.

| Area | Test | Expected |
| --- | --- | --- |
| Public notifications | Open from Home, press Back once; repeat with rapid double Back; repeat from cold-start push | Returns to the existing tab shell without duplicate Home or native crash. Back from the root may close Android's activity normally. |
| Public report | Tap resolved notification, return Home; finish a report and press Return Home twice | Correct owned detail, terminal report cleared, no stale tracking resume or duplicate tab shell. |
| Responder dispatch | Tap live assignment from foreground/background/cold start; repeat with expired assignment | Owned unexpired offer opens once; expired offer is explained; an accepted response is not overwritten by stale hydration. |
| Responder reports | Tap audited report, switch Home, single/double Back | Stable navigation and no dispatch/session reset. |
| Native notification tab routing | While Home, Profile, or Reports is active, tap a native dispatch/audited/resolved notification; repeat while Notifications is above the tabs | Correct tab or owned report opens with exact IDs. Tab-to-tab taps are not ignored; overlay returns retain one mounted tab shell. |
| Registration | Valid fields and ID, auto-confirm enabled | Bound session and ID upload precede session publication; Verification Pending appears, account is Ready for Review. |
| Registration recovery | Interrupt ID upload, or device binding | Failed upload reaches Pending's Upload Identity Document flow; failed binding keeps retry available without publishing an unbound session. No approval without ID. |
| Email confirmation | Register with email confirmation enabled in a test environment | Confirmation guidance, then sign-in and secure ID completion. Do not change production Auth settings for this test. |
| Approval | Existing pending account with no ID; upload ID while admin page is open | Visible in Awaiting ID without Approve controls; moves to actionable queue after successful upload. |
| Announcements | Test residents/responders with System Notices on; exercise All/Residents audiences in staging | Persisted inbox entry and foreground refresh; registered devices receive eligible push. Admin distinguishes inbox persistence from provider push acceptance. |
| Announcement recovery | Deny OS permission; lose internet during token setup; restore connectivity/foreground | Honest settings status, retry/setup available, automatic retry after transient errors; inbox still usable. User opt-outs remain respected. |
| Responder form | Open live report and saved draft; type with keyboard, scroll, autosave, submit, close | No map flicker; visual camera/GPS work paused while form covers it; operational telemetry continues only for the current live incident. |
| PDF | Export users including SUSPENDED and DEACTIVATED | Whole status labels, readable rows, no table overflow. |

If Android terminates unexpectedly, capture the crash buffer (`adb logcat -b crash -d`) immediately after reproduction. Review/redact personal data and tokens before sharing. A JavaScript export cannot validate Android native view teardown or OEM keyboard rendering.

No database migration is required for this follow-up. The previously deployed announcement audit schema remains required. No historical records, preferences, or account approvals are changed by these fixes.
