# 14: Ne pas confondre jours enregistrés et phases estimées

**Ce que l’utilisatrice peut faire :** distinguer les observations qu’elle a
saisies des durées par défaut et des projections calculées.

**Priorité :** P1 — à résoudre avant v1. Une nouvelle période utilise cinq jours
par défaut et le calendrier les présente ensuite comme jours de règles
enregistrés. Avec certains historiques courts ou atypiques, le repère d’ovulation
peut aussi tomber avant le dernier début de règles enregistré.

**Statut :** décisions produit validées — prêt à réaliser.

**Fichiers concernés :** `src/domain/periods/index.ts`,
`src/domain/forecast/estimate-cycle-phases.ts`,
`src/features/calendar/PeriodCalendarView.tsx`,
`src/features/periods/PeriodEventDialog.tsx`, textes et tests correspondants.

**Critères d’acceptation :**

- Le défaut actuel de cinq jours reste en place, mais il est qualifié comme
  hypothèse par défaut, jamais comme observation quotidienne saisie.
- Seuls les jours de suivi réellement consignés sont annoncés comme observés;
  les jours couverts uniquement par la durée par défaut sont distingués
  visuellement et dans les libellés accessibles.
- Un repère de phase n’est pas affiché si les dates calculées sont incohérentes
  avec l’ordre des phases ou les dates enregistrées. Aucune phase biologique ou
  ovulation n’est présentée comme observée à partir des seules dates de règles.
- Une estimation de prochain début déjà passée est explicitement qualifiée de
  passée. Un `± 0` n’est pas présenté comme certitude prédictive.
- Les libellés des phases restent compatibles avec le protocole documenté et
  n’impliquent aucune fiabilité contraceptive.

**Décisions validées :** garder le défaut de cinq jours, en le distinguant des
observations réellement saisies; conserver les repères approximatifs de phase
dans v1. Ils doivent rester explicitement estimés, cohérents avec les dates
enregistrées et non utilisables comme constat d’ovulation ou contraception.

**Tests :** nouveau début, durée inconnue, durée confirmée, données héritées et
importées; historique insuffisant, date passée, cycles courts/atypiques et
frontières de calendrier; interface, annonces accessibles et timezone tests.
