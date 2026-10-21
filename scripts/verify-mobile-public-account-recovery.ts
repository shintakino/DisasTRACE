import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRecoveryCredentials } from '../mobile/lib/recovery-session';
import {
  clearRememberedRecoveryUrl,
  getRememberedRecoveryUrl,
  rememberRecoveryUrl,
} from '../mobile/lib/recovery-link-inbox';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('parses Supabase recovery tokens from an Android deep-link fragment', () => {
  assert.deepEqual(
    getRecoveryCredentials('disastrace://reset-password#access_token=access&refresh_token=refresh', {}),
    { kind: 'tokens', accessToken: 'access', refreshToken: 'refresh' },
  );
  assert.deepEqual(
    getRecoveryCredentials('disastrace://reset-password?code=recovery-code', {}),
    { kind: 'code', code: 'recovery-code' },
  );
  assert.equal(getRecoveryCredentials('disastrace://reset-password', {}), null);

  // Expo Router can surface a URL fragment as the reserved "#" route
  // parameter even when React Native Linking no longer exposes it in url.
  assert.deepEqual(
    getRecoveryCredentials(null, { '#': 'access_token=access&refresh_token=refresh' }),
    { kind: 'tokens', accessToken: 'access', refreshToken: 'refresh' },
  );
});

check('retains only credential-bearing mobile recovery links until exchange', () => {
  clearRememberedRecoveryUrl();
  assert.equal(rememberRecoveryUrl('disastrace://reset-password'), false);
  assert.equal(rememberRecoveryUrl('https://attacker.example/reset-password?code=stolen'), false);
  assert.equal(rememberRecoveryUrl('disastrace://reset-password?code=recovery-code'), true);
  assert.equal(getRememberedRecoveryUrl(), 'disastrace://reset-password?code=recovery-code');
  clearRememberedRecoveryUrl();
  assert.equal(getRememberedRecoveryUrl(), null);
});

check('password updates require the recovery credential rather than a stale app session', () => {
  const screen = source('mobile/app/(auth)/reset-password.tsx');
  const rootLayout = source('mobile/app/_layout.tsx');
  const client = source('mobile/lib/supabase.ts');
  const forgotPassword = source('mobile/app/(auth)/forgot-password.tsx');
  assert.match(client, /flowType: 'pkce'/);
  assert.match(client, /storageKey: 'disastrace-mobile-password-recovery'/);
  assert.match(forgotPassword, /passwordRecoverySupabase\.auth\.resetPasswordForEmail/);
  assert.match(screen, /passwordRecoverySupabase\.auth\.setSession/);
  assert.match(screen, /passwordRecoverySupabase\.auth\.exchangeCodeForSession/);
  assert.match(screen, /passwordRecoverySupabase\.auth\.updateUser/);
  assert.match(screen, /handledRecoveryRef/);
  assert.match(screen, /handledRecoveryRef\.current === recoveryFingerprint/);
  assert.match(screen, /Linking\.getInitialURL/);
  assert.match(screen, /getRememberedRecoveryUrl/);
  assert.match(screen, /clearRememberedRecoveryUrl/);
  assert.match(rootLayout, /Linking\.addEventListener\('url'/);
  assert.match(rootLayout, /rememberRecoveryUrl/);
  assert.match(screen, /Request a new reset link/);
  assert.doesNotMatch(screen, /const existing = await supabase\.auth\.getSession\(\)/);
});

check('registration uploads an ID with the freshly issued access token', () => {
  const signup = source('mobile/app/(auth)/sign-up.tsx');
  const storage = source('mobile/lib/storage.ts');
  assert.match(signup, /const session = signUpData\.session/);
  assert.match(signup, /uploadGovernmentID\(registrationData\.idCardUri, registrationData\.idCardType, session\.access_token\)/);
  assert.match(signup, /registrationClient\.auth\.signUp/);
  assert.match(signup, /await completeRegistration\(/);
  assert.match(storage, /accessToken\?: string/);
  assert.match(storage, /const token = accessToken \|\| currentSession\?\.data\.session\?\.access_token/);
});

check('resident photo preview enters the editable chatbot intake', () => {
  const preview = source('mobile/app/help/preview.tsx');
  const chatbot = source('mobile/app/help/chatbot.tsx');
  assert.match(preview, /pathname: '\/help\/chatbot'/);
  assert.match(preview, /params: \{ mode: 'resident', photoUri \}/);
  assert.match(chatbot, /params\.photoUri/);
  assert.match(chatbot, /current\.startDraft\(\{ photoUri \}\)/);
  assert.match(chatbot, /ReviewRow label="Evidence"[\s\S]*onEdit/);
});

check('registration fields notify the scroll container when they receive focus', () => {
  const signup = source('mobile/app/(auth)/sign-up.tsx');
  const step1 = source('mobile/components/auth/Step1.tsx');
  const step2 = source('mobile/components/auth/Step2.tsx');
  const step4 = source('mobile/components/auth/Step4.tsx');
  assert.match(signup, /UIManager\.measureLayout/);
  assert.match(signup, /registrationScrollRef/);
  for (const content of [step1, step2, step4]) {
    assert.match(content, /onInputFocus\?: \(target: number\) => void/);
    assert.match(content, /onFocus=\{\(event\) => onInputFocus\?\./);
  }
});

check('approval queue excludes pending applications without an ID document', () => {
  const route = source('app/api/users/approval/route.ts');
  const policy = source('lib/account-approval.ts');
  assert.match(route, /approvalEligibilityWhere\(\)/);
  assert.match(policy, /isNotNull\(users\.idImageUrl\)/);
});

console.log('All mobile public-account recovery checks passed.');
