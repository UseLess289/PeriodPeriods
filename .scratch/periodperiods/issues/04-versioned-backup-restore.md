# 04: Export et restauration JSON versionnés

**Ce que l'utilisatrice ou le code appelant peut faire :** exporter les données
locales en JSON v1 et restaurer un fichier valide sans perte partielle.

**Bloqué par :** 03 — Modèle, dates civiles et stockage local.

**Statut :** terminé

- [x] L'export v1 contient toutes les périodes et les réglages sous
  `{ version: 1, periods: [], settings: {} }`.
- [x] L'import v1 remplace périodes et réglages existants, dans une transaction atomique.
- [x] Le payload entier est validé avant toute écriture.
- [x] JSON invalide, version inconnue, périodes/réglages invalides et doublons sont refusés sans mutation.
- [x] Une erreur survenue pendant une écriture annule la restauration complète.
- [x] Un aller-retour export/import restitue les mêmes données.
- [x] Aucun appel réseau ou écran d'import/export n'est ajouté dans cette phase.

**Tests :** format de l'export, aller-retour, remplacement, rejet sans mutation et rollback.
