# 01 — Cadrer les données et les écrans de v1

**Statut :** spécification en cours. **Bloqué par :** aucun. **Débloque :** 02 à 08.

**Résultat attendu :** une définition commune des événements enregistrables, des phases représentées, des réglages et des trois destinations de navigation. La personne qui utilise l'application sait ce qui est enregistré, calculé ou simplement projeté.

## Décisions à fixer

- La fenêtre d'ajout permet de renseigner le début, la fin et les symptômes. Préciser si le flux et les notes, déjà prévus par le modèle `Period`, doivent aussi figurer dans cette fenêtre ; l'interface actuelle ne saisit que `startDate`.
- Les graphiques représentent quatre **phases estimées** : menstruelle, folliculaire, ovulatoire et lutéale. Définir une méthode documentée, les données nécessaires et le degré de précision affiché ; ne pas assimiler une date de début à une observation de l'ovulation. Les limites des phases inférées doivent rester visibles.
- Confirmer la structure : Accueil = estimation, explication, calendrier ; Statistiques = historique et graphiques ; Réglages = préférences et données. Définir le devenir de l'URL existante `?view=calendar`.
- Exposer en priorité le **premier jour de la semaine**, déjà présent dans `AppSettings`. Garder les thèmes clair et sombre existants et prévoir le choix de langue français/anglais ; préciser comment leurs préférences sont enregistrées, exportées et restaurées.
- Direction visuelle choisie : lisibilité et repères proches d'Apple Calendrier, dans des tons roses pastel, en thèmes clair et sombre. Fixer les couleurs définitives des phases après avoir défini leur signification.
- Définir le sens de « sur un an » : horizon à partir d'aujourd'hui ou du dernier début observé, affichage des cycles qui tombent dans l'intervalle, hypothèse de réalisation et présentation de l'incertitude.
- L'import accepte un **export Flo original sans conversion manuelle**. Identifier les formats effectivement fournis par Flo et leurs variantes au moyen d'une documentation vérifiée et de fichiers d'exemple anonymisés ; fixer ensuite les règles d'ajout ou de remplacement, de dédoublonnage et de confirmation. La demande initiale d'import CSV reste à satisfaire, y compris si Flo fournit un autre format.

## Critères d'acceptation

- Un parcours écrit couvre première ouverture, ajout, consultation et import, avec états vide, erreur et données insuffisantes.
- Chaque donnée des graphiques est qualifiée comme observée, saisie ou estimée, y compris dans la légende et la version accessible.
- Les réglages et changements de format de sauvegarde possèdent une règle de migration des données existantes.
- Les tickets 02 à 08 peuvent être finalisés sans interpréter les champs supplémentaires ni les formats d'export Flo à la place de la personne porteuse du produit. Le découpage en quatre phases est fixé ; leur méthode et leurs limites doivent être documentées avant l'implémentation.

**Fichiers de référence :** `doc/planv0.md`, `doc/workflow.md`, `src/domain/periods/index.ts`, `src/App.tsx`, `src/data/period-backup.ts`, `src/features/history/CycleHistoryView.tsx`.

**Vérification :** revue des parcours et de la matrice données → calculs → vues ; absence de décision contradictoire dans les tickets suivants.
