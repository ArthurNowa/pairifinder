# Pairi Hunt — starter GitHub Pages

Application 100 % front-end : HTML/CSS/JavaScript + JSON + localStorage.

## Tester en local

Comme `animals.json` est chargé avec `fetch()`, évitez d'ouvrir directement `index.html` en `file://`.
Depuis le dossier du projet :

```bash
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000`.

## Déployer sur GitHub Pages

Poussez le dossier dans un dépôt GitHub, puis activez Pages sur la branche souhaitée. Aucun build n'est nécessaire.

## Données

Complétez `data/animals.json`. Chaque entrée attend :

- `id` : identifiant unique et stable
- `name`
- `zone`
- `location`
- `points` : 1, 2 ou 3
- `observation`

## Sauvegarde

L'état complet est enregistré dans `localStorage` après chaque modification. Le menu ⋮ permet aussi l'export/import JSON.
