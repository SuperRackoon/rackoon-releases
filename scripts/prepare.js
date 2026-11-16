// Fixe la version du build dans package.json : <majeur>.<mineur>.<build>.
// Lancé depuis le dossier de l'app. Ne commite rien : la version n'existe que
// dans le zip publié (app.getVersion() la renvoie).
const fs = require('fs');

const build = Number(process.argv[2]);
if (!Number.isInteger(build) || build < 0) throw new Error(`numéro de build invalide : ${process.argv[2]}`);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// Le launcher n'a pas de rackoon.json (sinon il apparaîtrait dans sa propre liste).
const manifest = fs.existsSync('rackoon.json') ? JSON.parse(fs.readFileSync('rackoon.json', 'utf8')) : { id: pkg.name };
const [major, minor] = String(pkg.version || '0.1.0').split('.');
pkg.version = `${Number(major) || 0}.${Number(minor) || 0}.${build}`;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log(`${manifest.id} ${pkg.version}`);
