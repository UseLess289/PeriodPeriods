# 16: Confirmer la navigation et les fonctions réellement incluses dans v1

**Résultat attendu :** refléter dans `doc/v1/` la portée validée par la personne
porteuse du produit avant d’annoncer v1.

**Priorité :** P2 — documentation et régression de navigation; la portée est
validée et les changements documentaires restent à faire.

**Statut :** décisions validées — prêt à mettre à jour la spécification.

**Constats :** la spécification demande l’ajout depuis chaque destination et la
préservation du mois consulté, alors que le bouton Ajouter n’est visible que sur
Accueil et le calendrier est recréé en y revenant. Le calcul `projectYear` existe
mais n’est pas présenté dans l’interface. `?view=calendar` retombe sur Accueil.

**Fichiers concernés :** `doc/v1/03-projections-un-an.md`,
`doc/v1/04-accueil-navigation-saisie.md`, `doc/v1/01-cadrage-donnees-ecrans.md`,
`src/App.tsx`, `src/features/calendar/PeriodCalendarView.tsx` et tests E2E.

**Décisions validées :**

1. Reporter les projections conditionnelles sur un an hors v1 et mettre à jour
   `doc/v1/03-projections-un-an.md` pour l’indiquer.
2. Garder l’action Ajouter sur Accueil seulement; le mois peut repartir sur le
   mois courant lorsque l’on revient à Accueil.
3. Faire mener `?view=calendar` à Statistiques, ancienne destination du
   calendrier.

**Critères d’acceptation après décision :**

- La projection annuelle est indiquée comme reportée et n’est pas présentée
  comme une fonction livrée en v1.
- La spécification accepte l’ajout sur Accueil seulement et le retour au mois
  courant lors du retour à cette vue.
- `?view=calendar` ouvre Statistiques; les contrôles arrière/avant du navigateur
  restent cohérents.

**Tests :** navigation directe, arrière/avant, ajout sur Accueil seulement,
réinitialisation du mois, alias `?view=calendar`; confirmer l’absence de
projection annuelle dans les vues de v1.
