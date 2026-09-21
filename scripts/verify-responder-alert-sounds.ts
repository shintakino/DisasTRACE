import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
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

const mobileAlerts = source('mobile/lib/push-notifications.ts');
const serverPush = source('lib/push-notifications.ts');
const responderHome = source('mobile/components/responder/ResponderHome.tsx');
const appConfig = source('mobile/app.json');
const nativeSoundPlugin = source('mobile/plugins/with-responder-emergency-sounds.js');

check('packages one native sound and Android channel for each responder emergency group', () => {
  for (const sound of [
    'responder_fire_alert.wav',
    'responder_medical_alert.wav',
    'responder_collision_alert.wav',
    'responder_flood_alert.wav',
    'responder_general_alert.wav',
  ]) {
    assert.match(nativeSoundPlugin, new RegExp(sound.replace('.', '\\.')));
    assert.match(mobileAlerts, new RegExp(sound.replace('.', '\\.')));
  }
  assert.match(appConfig, /with-responder-emergency-sounds/);
  assert.match(mobileAlerts, /setNotificationChannelAsync/);
  assert.match(mobileAlerts, /sound: alert\.sound/);
});

check('routes both foreground and push dispatch offers by their actual emergency type', () => {
  assert.match(responderHome, /getResponderEmergencyAlert\(typeOfEmergency\)\.channelId/);
  assert.match(responderHome, /getResponderEmergencyAlert\(typeOfEmergency\)\.sound/);
  assert.match(serverPush, /incidentType: string/);
  assert.match(serverPush, /channelId: alert\.channelId/);
  assert.match(serverPush, /emergencyType: incidentType/);
  assert.match(serverPush, /responder-flood-alerts/);
});

console.log('All responder alert sound checks passed.');
