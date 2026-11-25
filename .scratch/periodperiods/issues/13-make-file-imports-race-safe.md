# 13: Rendre les sélections et restaurations de fichiers cohérentes

**Ce que l’utilisatrice peut faire :** voir un aperçu qui correspond toujours au
fichier sélectionné et savoir sans ambiguïté si une restauration a réussi.

**Priorité :** P1 — à résoudre avant v1. Une lecture lente d’un premier fichier
peut écraser l’aperçu du second; un échec de rafraîchissement après l’écriture
réussie peut annoncer à tort que rien n’a été importé.

**Statut :** prêt à réaliser.

**Fichiers concernés :** `src/features/settings/BackupSettingsView.tsx`,
`src/data/period-data-store.ts`, tests de sauvegarde/import et
`e2e/v1-import-and-entry.spec.ts`.

**Critères d’acceptation :**

- Nom, type, contenu, aperçu et payload à confirmer restent liés à la même
  sélection de fichier.
- Une sélection plus récente invalide les lectures en cours d’une ancienne
  sélection; annuler ou choisir un autre fichier ne laisse pas un aperçu obsolète
  confirmable.
- Importer le CSV ou Flo continue d’ajouter de façon atomique et de signaler les
  doublons. La restauration JSON valide tout le fichier avant le remplacement.
- Si IndexedDB a été remplacée mais que le rafraîchissement de l’écran échoue,
  le message distingue clairement « import enregistré » de « affichage à
  recharger »; il ne prétend jamais que les données sont intactes.
- Un échec avant l’écriture ne change aucune donnée et conserve une possibilité
  de réessayer.

**Tests :** retarder la lecture du premier fichier puis en sélectionner un
second; mélanger les types de fichiers; annuler pendant la lecture; vérifier le
fichier exact présenté et confirmé; simuler séparément un échec d’écriture et un
échec de rafraîchissement après écriture réussie.
