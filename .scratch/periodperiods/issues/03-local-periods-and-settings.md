# 03: Modèle, dates civiles et stockage local

**Ce que l'utilisatrice ou le code appelant peut faire :** enregistrer, consulter,
modifier et supprimer des périodes, et lire ou modifier les réglages locaux par
une API TypeScript.

**Bloqué par :** aucun.

**Statut :** terminé

- [x] Les dates civiles sont strictement validées et ne changent pas selon le fuseau horaire.
- [x] La fin facultative ne précède pas le début; les débuts dupliqués sont refusés.
- [x] Les cycles atypiques, périodes qui se chevauchent et dates futures ne sont pas rejetés par des règles non spécifiées.
- [x] Le calcul des jours civils couvre DST, année bissextile et changement d'année.
- [x] Le modèle `Period` et les valeurs permises pour `flow` sont définis.
- [x] Dexie conserve les périodes; l'API couvre ajout, lecture, modification et suppression.
- [x] La modification préserve `id` et `createdAt`, et actualise `updatedAt`.
- [x] Les réglages sont conservés; les défauts sont médiane-6 et lundi.
- [x] Les tests passent par les API publiques et vérifient la persistance après réouverture.

**Tests :** validation/calcul civil, CRUD, conflits et réouverture de la base IndexedDB.
