import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

const mapPage = read('app/(dashboard)/map/page.tsx');
const incidentPanel = read('components/map/incident-panel.tsx');
const mapContainer = read('components/map/map-container.tsx');
const mapOverlays = read('components/map/command-map-overlays.tsx');
const mapData = read('hooks/use-map-data.ts');

assert.match(mapPage, /flex h-full min-h-0 flex-col/);
assert.match(mapPage, /relative flex min-h-0 flex-1 overflow-hidden/);
assert.match(mapPage, /h-full min-h-0 min-w-0 flex-1/);
assert.match(incidentPanel, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
assert.match(mapContainer, /onLoad=\{\(\) => \{/);
assert.match(mapContainer, /onError=\{\(event\) => \{/);
assert.match(mapContainer, /Map unavailable/);
assert.match(mapContainer, /Retry map/);
assert.match(mapContainer, /const visibleIncidentKey = useMemo/);
assert.match(mapContainer, /map\.fitBounds\(bounds/);
assert.match(mapContainer, /clicking a report focuses only that one marker/);
assert.match(mapOverlays, /max-h-\[calc\(100%-2rem\)\] w-60 max-w-\[calc\(100%-2rem\)\] space-y-3 overflow-y-auto/);
assert.doesNotMatch(mapOverlays, /hidden w-60 space-y-3 lg:block/);
assert.match(mapOverlays, /const \[isLegendOpen, setIsLegendOpen\] = useState\(true\)/);
assert.match(mapData, /Promise\.allSettled/);
assert.match(mapData, /Some supporting map data is temporarily unavailable/);

console.log('Map workspace containment and failure-recovery checks passed.');
