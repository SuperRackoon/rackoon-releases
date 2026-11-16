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
const { REPO, run, tryRun, readJson, fileInfo, updateStable } = require('./stable');

const [appDir, releasesDir] = process.argv.slice(2).map(p => path.resolve(p));

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
const { size, sha256 } = fileInfo(zipPath);

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

// ── 2 & 3. Icône + stable.json ─────────────────────────────────────────────
updateStable(releasesDir, `${manifest.name || id} ${version}`, (stable) => {
  let iconRel = null;
  if (manifest.icon) {
    const src = path.join(appDir, manifest.icon);
    if (fs.existsSync(src)) {
      iconRel = `icons/${id}${path.extname(src).toLowerCase()}`;
      fs.mkdirSync(path.join(releasesDir, 'icons'), { recursive: true });
      fs.copyFileSync(src, path.join(releasesDir, iconRel));
    }
  }
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
});
