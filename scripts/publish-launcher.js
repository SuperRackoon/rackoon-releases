// Publie l'installeur du launcher dans la release fixe "launcher" :
//
//   https://github.com/SuperRackoon/rackoon-releases/releases/download/launcher/Rackoon-Launcher-Setup.exe
//
// Ce lien ne change jamais (c'est lui qu'on met sur un site). Les launchers
// installés y lisent latest.yml pour se mettre à jour (electron-updater).
//
// Usage : node publish-launcher.js <dossier du launcher> <dossier de ce dépôt>
const path = require('path');
const { REPO, run, tryRun, readJson, fileInfo, updateStable } = require('./stable');

const TAG = 'launcher';
const SETUP = 'Rackoon-Launcher-Setup.exe';

const [launcherDir, releasesDir] = process.argv.slice(2).map(p => path.resolve(p));
const version = readJson(path.join(launcherDir, 'package.json')).version;
const dist = path.join(launcherDir, 'dist');
const setup = path.join(dist, SETUP);
const { size, sha256 } = fileInfo(setup);

const commit = run('git', ['rev-parse', '--short', 'HEAD'], launcherDir);
const notes = run('git', ['log', '-1', '--format=%B'], launcherDir);
const title = `Rackoon Launcher ${version}`;
const body = `Installeur du launcher : **${SETUP}**\n\n${notes}\n\nCommit ${commit}`;

console.log(`${title} (${(size / 1048576).toFixed(1)} Mo)`);

if (!tryRun('gh', ['release', 'view', TAG, '--repo', REPO])) {
  run('gh', ['release', 'create', TAG, '--repo', REPO, '--title', title, '--notes', body, '--latest=false']);
}
// L'installeur d'abord, latest.yml ensuite : un launcher ne voit la nouvelle
// version qu'une fois son installeur en ligne.
run('gh', ['release', 'upload', TAG, setup, `${setup}.blockmap`, '--clobber', '--repo', REPO]);
run('gh', ['release', 'upload', TAG, path.join(dist, 'latest.yml'), '--clobber', '--repo', REPO]);
run('gh', ['release', 'edit', TAG, '--repo', REPO, '--title', title, '--notes', body]);

updateStable(releasesDir, title, (stable) => {
  stable.launcher = {
    version,
    url: `https://github.com/${REPO}/releases/download/${TAG}/${SETUP}`,
    size,
    sha256,
    notes: notes.split('\n')[0],
    commit,
    publishedAt: new Date().toISOString(),
  };
});
