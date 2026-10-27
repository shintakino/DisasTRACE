import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const typescriptChecks = [
  'verify-pacc-completion-lifecycle', 'verify-rejected-report-workflow', 'verify-dispatch-recovery',
  'verify-responder-duty-availability', 'verify-responder-report-reliability', 'verify-responder-documentation-pending',
  'verify-pacc-verification-workspace', 'verify-responder-route-lifecycle', 'verify-user-approval-lifecycle',
  'verify-announcement-delivery', 'verify-otp-viewport', 'verify-responder-recovery',
  'verify-testing25-lifecycle', 'verify-public-mobile-reliability', 'verify-responder-notification-routing',
  'verify-public-notification-navigation', 'verify-mobile-public-account-recovery', 'verify-responder-transport-start',
  'verify-responder-draft-form-session', 'verify-responder-alert-sounds', 'verify-mobile-resilience',
  'verify-public-response-lifecycle', 'verify-hospital-destination-policy', 'verify-responder-form-controls',
  'verify-registration-completion', 'verify-user-registry-pdf',
];
const javascriptChecks = [
  'verify-responder-operation-races', 'verify-reported-bug-api-contracts', 'verify-responder-availability-release',
  'verify-pacc-completion-api', 'verify-mobile-navigation-stack',
];
let failed = 0;
for (const [name, args] of [
  ...typescriptChecks.map(name => [name, [resolve('node_modules/tsx/dist/cli.mjs'), `scripts/${name}.ts`]]),
  ...javascriptChecks.map(name => [name, [`scripts/${name}.mjs`]]),
]) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60_000, windowsHide: true });
  if (result.status === 0) console.log(`PASS ${name}`);
  else {
    failed++;
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    console.error(`FAIL ${name}\n${output.slice(0, 1800)}${output.length > 1800 ? '\n…\n' + output.slice(-500) : ''}`);
  }
}
console.log(`${typescriptChecks.length + javascriptChecks.length - failed}/${typescriptChecks.length + javascriptChecks.length} reported-bug regression scripts passed.`);
process.exitCode = failed ? 1 : 0;
