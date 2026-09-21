const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// Short, synthetic notification tones keep the app self-contained and avoid
// bundling a third-party recording for operational alerts. Android channels
// require their sound resources to be present at native build time.
const ALERT_SOUNDS = [
  { filename: 'responder_fire_alert.wav', tones: [920, 1180, 920, 1180] },
  { filename: 'responder_medical_alert.wav', tones: [660, 880, 660] },
  { filename: 'responder_collision_alert.wav', tones: [820, 700, 580] },
  { filename: 'responder_flood_alert.wav', tones: [520, 590, 520] },
  { filename: 'responder_general_alert.wav', tones: [740, 740, 740] },
];

function createToneWav(tones) {
  const sampleRate = 8_000;
  const durationSeconds = 0.42;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const tone = tones[Math.min(tones.length - 1, Math.floor(progress * tones.length))];
    const time = index / sampleRate;
    const envelope = Math.min(1, index / 80, (sampleCount - index) / 160);
    const value = Math.round(Math.sin(2 * Math.PI * tone * time) * 0.34 * envelope * 32_767);
    buffer.writeInt16LE(value, 44 + index * 2);
  }
  return buffer;
}

module.exports = function withResponderEmergencySounds(config) {
  return withDangerousMod(config, ['android', async (modConfig) => {
    const rawPath = path.join(
      modConfig.modRequest.projectRoot,
      'android', 'app', 'src', 'main', 'res', 'raw',
    );
    fs.mkdirSync(rawPath, { recursive: true });
    for (const sound of ALERT_SOUNDS) {
      fs.writeFileSync(path.join(rawPath, sound.filename), createToneWav(sound.tones));
    }
    return modConfig;
  }]);
};
