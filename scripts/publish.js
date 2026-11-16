// Publie le zip d'une app compilée :
//   1. release "<id>-v<version>" dans ce dépôt, avec le zip en pièce jointe
//   2. icône de l'app copiée dans icons/
//   3. entrée de l'app mise à jour dans stable.json (commit + push)
//
// Usage : node publish.js <dossier de l'app> <dossier de ce dépôt>
// La release est créée AVANT de toucher stable.json : le launcher ne voit
// jamais une version dont le zip n'existe pas encore.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO = 'SuperRackoon/rackoon-releases';
const [appDir, releasesDir] = process.argv.slice(2).map(p => path.resolve(p));

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const tryRun = (cmd, args, cwd) => { try { run(cmd, args, cwd); return true; } catch (_) { return false; } };
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const pkg = readJson(path.join(appDir, 'package.json'));
const manifest = readJson(path.join(appDir, 'rackoon.json'));
const id = String(manifest.id);
const version = pkg.version;
const tag = `${id}-v${version}`;

// ── Zip ────────────────────────────────────────────────────────────────────
const distDir = path.join(appDir, 'dist');
const zips = fs.readdirSync(distDir).filter(f => f.endsWith('.zip'));
if (zips.length !== 1) throw new Error(`un seul zip attendu dans dist/, trouvé : ${zips.join(', ') || 'aucun'}`);
const zipPath = path.join(distDir, zips[0]);
const zipName = zips[0];
const size = fs.statSync(zipPath).size;
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');

const commit = run('git', ['rev-parse', '--short', 'HEAD'], appDir);
const notes = run('git', ['log', '-1', '--format=%B'], appDir);

console.log(`${tag} : ${zipName} (${(size / 1048576).toFixed(1)} Mo, sha256 ${sha256.slice(0, 12)}…)`);

// ── 1. Release ─────────────────────────────────────────────────────────────
if (tryRun('gh', ['release', 'view', tag, '--repo', REPO])) {
  // Relance d'un même build : on remplace le zip.
  run('gh', ['release', 'upload', tag, zipPath, '--clobber', '--repo', REPO]);
} else {
  run('gh', ['release', 'create', tag, zipPath, '--repo', REPO,
    '--title', `${manifest.name || id} ${version}`, '--notes', `${notes}\n\nCommit ${commit}`]);
}
const url = `https://github.com/${REPO}/releases/download/${tag}/${encodeURIComponent(zipName)}`;

// ── 2 & 3. Icône + stable.json, avec nouvelles tentatives si une autre app
// publie en même temps (on repart toujours de la dernière version distante).
let iconRel = null;
function applyChanges() {
  if (manifest.icon) {
    const src = path.join(appDir, manifest.icon);
    if (fs.existsSync(src)) {
      iconRel = `icons/${id}${path.extname(src).toLowerCase()}`;
      fs.mkdirSync(path.join(releasesDir, 'icons'), { recursive: true });
      fs.copyFileSync(src, path.join(releasesDir, iconRel));
    }
  }
  const stableFile = path.join(releasesDir, 'stable.json');
  const stable = fs.existsSync(stableFile) ? readJson(stableFile) : { schema: 1, apps: {} };
  stable.apps = stable.apps || {};
  stable.apps[id] = {
    version,
    url,
    size,
    sha256,
    notes: notes.split('\n')[0],
    commit,
    publishedAt: new Date().toISOString(),
    name: manifest.name || id,
    tagline: manifest.tagline || '',
    description: manifest.description || '',
    accent: manifest.accent || null,
    tags: manifest.tags || [],
    order: manifest.order ?? 99,
    icon: iconRel ? `https://raw.githubusercontent.com/${REPO}/main/${iconRel}` : null,
    ...(manifest.minLauncher ? { minLauncher: manifest.minLauncher } : {}),
  };
  fs.writeFileSync(stableFile, JSON.stringify(stable, null, 2) + '\n');
}

run('git', ['config', 'user.name', 'github-actions[bot]'], releasesDir);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], releasesDir);

for (let attempt = 1; ; attempt++) {
  run('git', ['fetch', 'origin', 'main'], releasesDir);
  run('git', ['reset', '--hard', 'origin/main'], releasesDir);
  applyChanges();
  run('git', ['add', '-A'], releasesDir);
  if (tryRun('git', ['diff', '--cached', '--quiet'], releasesDir)) { console.log('stable.json déjà à jour'); break; }
  run('git', ['commit', '-m', `${manifest.name || id} ${version}`], releasesDir);
  if (tryRun('git', ['push', 'origin', 'HEAD:main'], releasesDir)) { console.log(`stable.json → ${id} ${version}`); break; }
  if (attempt >= 5) throw new Error('impossible de pousser stable.json après 5 tentatives');
  console.log(`push refusé (tentative ${attempt}), nouvel essai…`);
}
