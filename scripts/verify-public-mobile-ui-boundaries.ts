import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');

const reportRoute = source('app/api/reports/[id]/route.ts');
assert.match(reportRoute, /crewFindings: canViewOperationalDetails[\s\S]*?: undefined/);
assert.doesNotMatch(reportRoute, /Responder documentation was submitted\./);

const reportDetail = source('mobile/app/(tabs)/reports/[id].tsx');
assert.match(reportDetail, /typeof report\.crewFindings === 'string'/);
assert.match(reportDetail, /report\.crewFindings\.trim\(\)\.length > 0/);

for (const file of [
  'mobile/app/help/chatbot.tsx',
  'mobile/app/help/chatbot-pending.tsx',
  'mobile/app/help/guest-history.tsx',
]) {
  const screen = source(file);
  assert.match(screen, /from 'react-native-safe-area-context'/);
  assert.match(screen, /edges=\{\['top', 'bottom', 'left', 'right'\]\}/);
  assert.doesNotMatch(screen, /SafeAreaView[^\n]*from 'react-native'/);
}

const notifications = source('mobile/app/notifications.tsx');
assert.match(notifications, /SafeAreaView edges=\{\['top', 'left', 'right'\]\} className="bg-\[#1E3A8A\] rounded-b-3xl/);
assert.match(notifications, /text-2xl font-bold text-white">Notifications/);
assert.match(notifications, /onPress=\{handleClearAll\}/);
assert.match(notifications, /Clear All/);

const privacy = source('mobile/app/privacy-security.tsx');
assert.match(privacy, /SafeAreaView edges=\{\['top', 'left', 'right'\]\} className="bg-\[#1E3A8A\] rounded-b-3xl/);

const responderHome = source('mobile/components/responder/ResponderHome.tsx');
assert.match(responderHome, /paddingTop: insets\.top \+ 12/);
assert.doesNotMatch(responderHome, /paddingTop: \(StatusBar\.currentHeight \|\| 24\) \+ 12/);

console.log('Public mobile UI boundary and safe-area checks passed.');
