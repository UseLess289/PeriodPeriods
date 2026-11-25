# 05 — Construire la page Statistiques et ses graphiques

**Statut :** spécification en cours. Les projections sur un an sont reportées hors v1.

**Résultat attendu en v1 :** consulter les intervalles entre débuts et les observations quotidiennes dans une page dédiée. Les phases estimées sont des repères du calendrier sur Accueil, pas des observations de Statistiques. Les graphiques s'inspirent de Drip ; les tons roses pastel s'accordent aux deux thèmes et restent lisibles sans perception des couleurs.

## Contenu à spécifier

- Déplacer ou composer l'historique actuellement affiché sur l'accueil dans Statistiques, sans dupliquer les calculs de `getCycleHistory`.
- Fixer les axes, unités, périodes affichées, interactions tactiles et légendes des courbes. La courbe d'intervalles observés peut être conçue indépendamment des quatre phases estimées ; définir la méthode de calcul et ses limites au ticket 02 avant de représenter ces phases. Ne pas afficher une date d'ovulation précise comme une observation à partir des seules dates de règles.
- Distinguer graphiquement et textuellement observation, donnée saisie et projection ; garder une liste ou un tableau lisible donnant accès aux mêmes valeurs sans le graphique.
- Définir ce qui se passe avec zéro, une ou quelques périodes et avec une date future importée.

## Critères d'acceptation

- Les valeurs graphiques coïncident avec la liste et les fonctions de domaine ; les quatre phases déduites de dates de règles sont toujours libellées comme **estimées**, jamais comme observations biologiques ni comme fenêtre contraceptive fiable.
- La page fonctionne au toucher, au clavier et avec une alternative accessible ; les marqueurs et motifs apportent une distinction autre que la couleur.
- Les graphiques restent lisibles à 320 px, en thèmes clair et sombre et en réduction du mouvement.

**Fichiers concernés :** `src/features/history/CycleHistoryView.tsx`, nouveau répertoire `src/features/stats/`, `src/domain/history/get-cycle-history.ts`, `src/App.tsx`, `src/index.css`.

**Tests :** invariants de séries dans le domaine, étiquettes et unités, données absentes ou abondantes, passage de thème, viewport mobile, axe et absence de débordement dans `src/App.test.tsx` et `e2e/`.
