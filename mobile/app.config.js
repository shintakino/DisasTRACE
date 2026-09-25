const fs = require('node:fs');
const path = require('node:path');

const localEasConfigPath = path.join(__dirname, 'eas.local.json');

function readLocalEasConfig() {
  if (!fs.existsSync(localEasConfigPath)) return {};

  const parsed = JSON.parse(fs.readFileSync(localEasConfigPath, 'utf8'));
  return {
    ...(typeof parsed.owner === 'string' && parsed.owner.trim()
      ? { owner: parsed.owner.trim() }
      : {}),
    ...(typeof parsed.projectId === 'string' && parsed.projectId.trim()
      ? { projectId: parsed.projectId.trim() }
      : {}),
  };
}

function mergeLocalEasIdentity(config, localEasConfig = readLocalEasConfig()) {
  const { owner, projectId } = localEasConfig;
  const extra = { ...(config.extra || {}) };

  if (projectId) {
    extra.eas = { projectId };
  } else {
    delete extra.eas;
  }

  const resolvedConfig = {
    ...config,
    extra,
  };

  if (owner) {
    resolvedConfig.owner = owner;
  } else {
    delete resolvedConfig.owner;
  }

  return resolvedConfig;
}

module.exports = ({ config }) => mergeLocalEasIdentity(config);
module.exports.mergeLocalEasIdentity = mergeLocalEasIdentity;
