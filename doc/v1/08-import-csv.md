# 08 — Importer des événements depuis un export Flo

**Statut :** spécification en cours. **Bloqué par :** 01 ; 07 si la prévisualisation doit être bilingue.

**Résultat attendu :** importer des dates et, lorsque le format le permet, les autres champs depuis un **export Flo original, sans conversion préalable par l'utilisatrice**, contrôler les données avant écriture et retrouver les événements dans l'application. L'import/export JSON PeriodPeriods reste une sauvegarde complète distincte. L'import CSV demandé initialement fait aussi partie du périmètre, même si l'export Flo natif s'avère être d'un autre type.

## Contrat à décider

- Vérifier les formats d'export effectivement proposés par Flo et obtenir des exemples **anonymisés** représentatifs avant d'écrire les parseurs. Accepter directement les formats d'export Flo pertinents ; définir en plus un schéma CSV documenté pour la demande d'import CSV. Ne pas imposer une conversion manuelle et ne pas inventer de colonnes Flo.
- Définir champs obligatoires et facultatifs, format des dates, encodage, lignes vides, doublons internes et doublons avec la base ; pour le CSV, définir aussi séparateur et guillemets. Vérifier comment début, fin et symptômes de Flo se transposent dans `Period` ; signaler dans l'aperçu les champs non transférables sans les inventer.
- Définir ajout ou remplacement, effet sur les réglages, possibilité d'annuler avant confirmation et résumé du résultat. Une importation invalide ne doit pas modifier partiellement IndexedDB.

## Critères d'acceptation

- L'aperçu indique fichier, nombre de lignes utilisables, dates couvertes, erreurs compréhensibles et effet exact de la confirmation.
- Un fichier invalide ou une annulation conserve intégralement les données existantes.
- Les fichiers de plus de 10 Mio sont refusés avant la lecture, qu’il s’agisse d’une sauvegarde, d’un export Flo ou d’un CSV. Les durées valides ne sont pas tronquées.
- La confirmation écrit les événements selon le contrat décidé et l'accueil, le calendrier et les statistiques reflètent les nouvelles données.

**Fichiers concernés :** nouveau parseur dans `src/data/`, `src/data/period-data-store.ts`, `src/features/settings/BackupSettingsView.tsx`, `src/domain/periods/index.ts` selon les colonnes retenues.

**Tests :** exemples anonymisés des formats Flo retenus et du CSV documenté, dates impossibles, doublons, fichier vide ou invalide, atomicité, aperçu et confirmation ; pour le CSV, guillemets et séparateurs. Tests dans `src/data/*.test.ts`, `src/App.test.tsx` et `e2e/`.
