import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sharedConfig = JSON.parse(readFileSync('mobile/app.json', 'utf8')).expo;
type ResolvedExpoConfig = Record<string, unknown> & {
  owner?: string;
  extra: Record<string, unknown> & {
    eas?: { projectId?: string };
  };
};

const appConfig = require('../mobile/app.config.js') as {
  mergeLocalEasIdentity: (
    config: Record<string, unknown>,
    localEasConfig: { owner?: string; projectId?: string },
  ) => ResolvedExpoConfig;
};

assert.equal(sharedConfig.owner, undefined, 'Expo ownership must not be committed');
assert.equal(sharedConfig.extra?.eas, undefined, 'EAS project IDs must not be committed');

const unlinked = appConfig.mergeLocalEasIdentity({
  name: 'DisasTRACE',
  owner: 'stale-owner',
  extra: { router: {}, eas: { projectId: 'stale-project' } },
}, {});
assert.equal(unlinked.owner, undefined);
assert.equal(unlinked.extra.eas, undefined);

const localBuild = appConfig.mergeLocalEasIdentity({
  name: 'DisasTRACE',
  extra: { router: {} },
}, {
  owner: 'personal-expo-account',
  projectId: 'personal-eas-project-id',
});
assert.equal(localBuild.owner, 'personal-expo-account');
assert.equal(localBuild.extra.eas.projectId, 'personal-eas-project-id');

const gitignore = readFileSync('.gitignore', 'utf8');
assert.match(gitignore, /^mobile\/eas\.local\.json$/m);

console.log('Per-developer Expo/EAS project configuration checks passed.');
