import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
};
const copyWorker = readFileSync(join(root, 'scripts/copy-maplibre-worker.mjs'), 'utf8');
const workerConfig = readFileSync(join(root, 'components/map/maplibre-worker.ts'), 'utf8');
const commandMap = readFileSync(join(root, 'components/map/map-container.tsx'), 'utf8');
const hospitalMap = readFileSync(join(root, 'components/account/hospital-settings.tsx'), 'utf8');

assert.match(packageJson.dependencies['maplibre-gl'], /^\^6\./);
assert.equal(packageJson.scripts.prebuild, 'node ./scripts/copy-maplibre-worker.mjs');
assert.equal(packageJson.scripts.predev, 'node ./scripts/copy-maplibre-worker.mjs');
assert.match(copyWorker, /maplibre-gl-worker\.mjs/);
assert.match(copyWorker, /maplibre-gl-shared\.mjs/);
assert.match(workerConfig, /setWorkerUrl\('\/maplibre\/maplibre-gl-worker\.mjs'\)/);
assert.match(commandMap, /configureMapLibreWorker\(\)/);
assert.match(hospitalMap, /configureMapLibreWorker\(\)/);

console.log('MapLibre v6 worker configuration checks passed.');
