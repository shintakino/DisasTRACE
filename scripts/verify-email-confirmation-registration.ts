import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const signUp = fs.readFileSync(path.join(root, 'mobile/app/(auth)/sign-up.tsx'), 'utf8');
const pending = fs.readFileSync(path.join(root, 'mobile/app/(verification)/pending.tsx'), 'utf8');
const idRoute = fs.readFileSync(path.join(root, 'app/api/verification/id/route.ts'), 'utf8');

assert.doesNotMatch(signUp, /throw new Error\('Your account was created, but the required ID cannot be uploaded/);
assert.match(signUp, /if \(!signUpData\.session\) \{\s*\/\/ Email confirmation intentionally creates no session/);
assert.match(pending, /Upload Identity Document/);
assert.match(pending, /IdentityDocumentUploader/);
assert.match(idRoute, /export async function GET\(\)/);
assert.match(idRoute, /hasDocument: Boolean\(profile\.idImageUrl\)/);

console.log('Email-confirmation registration recovery verified.');
