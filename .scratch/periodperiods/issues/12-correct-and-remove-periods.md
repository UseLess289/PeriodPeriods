# 12: Corriger ou retirer une période sans créer de doublon

**Ce que l’utilisatrice peut faire :** corriger les détails ou la date d’un
début déjà enregistré, ou retirer une période qu’elle ne souhaite plus garder.

**Priorité :** P1 — à résoudre avant v1. La saisie actuelle peut créer deux
enregistrements quand on change la date d’une période existante; l’interface
n’offre pas de suppression.

**Statut :** prêt à réaliser — suppression avec confirmation retenue.

**Fichiers concernés :** `src/App.tsx`, `src/features/periods/PeriodEventDialog.tsx`,
`src/features/calendar/PeriodCalendarView.tsx`, tests de `src/App.test.tsx` et
`e2e/phase-4.spec.ts`.

**Critères d’acceptation :**

- Modifier une période conserve son identifiant, ses champs et ses observations;
  modifier son début actualise l’enregistrement au lieu d’en créer un second.
- Un début déjà utilisé bloque la correction sans modifier aucune période; le
  formulaire conserve les valeurs pour permettre une correction.
- Une suppression ne peut pas arriver par inadvertance. Après confirmation, les
  calendriers, statistiques, estimations et sauvegardes reflètent le retrait.
- Annuler une correction ou une suppression ne change pas les données.
- Les changements restent atomiques dans IndexedDB et les mises à jour sont
  testées par l’API publique et l’interface.

**Décision validée :** confirmer la suppression en nommant la date; pas de
corbeille ni de mécanisme d’annulation supplémentaire pour v1.

**Tests :** changement de date sans doublon; conflit avec une autre date sans
mutation; conservation des observations; suppression confirmée et annulée;
rafraîchissement du calendrier, de l’estimation, des statistiques et de l’export.
