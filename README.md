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
      "publishedAt": "2026-10-13T00:00:00Z",
      "minLauncher": "1.1.0"
    }
  }
}
```
