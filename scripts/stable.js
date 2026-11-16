// Outils communs aux scripts de publication.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO = 'SuperRackoon/rackoon-releases';

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const tryRun = (cmd, args, cwd) => { try { run(cmd, args, cwd); return true; } catch (_) { return false; } };
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function fileInfo(file) {
  return {
    size: fs.statSync(file).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  };
}

// Modifie stable.json (et éventuellement d'autres fichiers du dépôt) puis
// commite et pousse. Si une autre publication passe en même temps, on repart
// de la dernière version distante et on réapplique `mutate(stable)`.
function updateStable(releasesDir, message, mutate) {
  run('git', ['config', 'user.name', 'github-actions[bot]'], releasesDir);
  run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], releasesDir);
  const stableFile = path.join(releasesDir, 'stable.json');

  for (let attempt = 1; ; attempt++) {
    run('git', ['fetch', 'origin', 'main'], releasesDir);
    run('git', ['reset', '--hard', 'origin/main'], releasesDir);
    const stable = fs.existsSync(stableFile) ? readJson(stableFile) : { schema: 1, apps: {} };
    stable.apps = stable.apps || {};
    mutate(stable);
    fs.writeFileSync(stableFile, JSON.stringify(stable, null, 2) + '\n');
    run('git', ['add', '-A'], releasesDir);
    if (tryRun('git', ['diff', '--cached', '--quiet'], releasesDir)) { console.log('stable.json déjà à jour'); return; }
    run('git', ['commit', '-m', message], releasesDir);
    if (tryRun('git', ['push', 'origin', 'HEAD:main'], releasesDir)) { console.log(`stable.json → ${message}`); return; }
    if (attempt >= 5) throw new Error('impossible de pousser stable.json après 5 tentatives');
    console.log(`push refusé (tentative ${attempt}), nouvel essai…`);
  }
}

module.exports = { REPO, run, tryRun, readJson, fileInfo, updateStable };
