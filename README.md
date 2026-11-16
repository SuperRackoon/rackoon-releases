# Rackoon — téléchargements

Ce dépôt ne contient pas de code : il héberge les versions publiées des applications Rackoon.

- **Rackoon Launcher** installe et met à jour toutes les applications. C'est le seul fichier à télécharger.
- Les applications sont publiées dans les [Releases](../../releases), une release par version (`music-v0.2.0`, `streaming-v0.1.0`…).
- `stable.json` liste la dernière version stable de chaque application. Le launcher le lit pour proposer les installations et mises à jour.

## Format de `stable.json`

```json
{
  "schema": 1,
  "apps": {
    "music": {
      "version": "0.2.0",
      "url": "https://github.com/SuperRackoon/rackoon-releases/releases/download/music-v0.2.0/rackoon-music-0.2.0-win-x64.zip",
      "size": 104857600,
      "sha256": "…",
      "notes": "Nouveautés de la version",
      "commit": "238b634",
      "publishedAt": "2026-10-13T00:00:00Z",
      "name": "Rackoon Music",
      "tagline": "…",
      "description": "…",
      "accent": "#e8a020",
      "tags": ["Musique"],
      "order": 1,
      "icon": "https://raw.githubusercontent.com/SuperRackoon/rackoon-releases/main/icons/music.png",
      "minLauncher": "1.1.0"
    }
  }
}
```

Les infos d'affichage (`name`, `tagline`, `icon`…) viennent du `rackoon.json` de l'app : le launcher peut présenter une app avant qu'elle soit installée. `minLauncher` est optionnel.

## Publication automatique

Chaque app a un `.github/workflows/release.yml` qui appelle [`publish-app.yml`](.github/workflows/publish-app.yml) : à chaque push sur `main`, l'app est compilée sur GitHub, le zip est publié en release et `stable.json` est mis à jour ([`scripts/publish.js`](scripts/publish.js)).

La version publiée est `<majeur>.<mineur>` du `package.json` de l'app + le numéro du build (`0.1.0` → `0.1.37`). Le dépôt de l'app a besoin d'un secret `RELEASES_TOKEN` (jeton GitHub avec « Contents : Read and write » sur ce dépôt).
