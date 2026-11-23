# PeriodPeriods — spécification de la phase 3

## Objectif

Finir l’expérience de consultation sans modifier les données ni les calculs de la
phase 2 : rendre l’historique des intervalles compréhensible, expliquer
l’estimation médiane déjà affichée, puis vérifier les finitions responsive,
d’accessibilité et de mouvement.

## Histoires utilisateur

1. En tant qu’utilisatrice, je peux consulter les intervalles entre mes débuts
   passés et voir l’étendue réellement observée dans tout mon historique.
2. En tant qu’utilisatrice, je peux comprendre comment l’estimation existante
   utilise la médiane et, lorsqu’elle est disponible, la plage historique.
3. En tant qu’utilisatrice ayant importé une date future, je peux la distinguer
   des débuts passés et savoir qu’elle n’entre pas dans l’historique calculé ni
   dans l’estimation.
4. En tant qu’utilisatrice sur petit écran, au clavier ou avec un lecteur
   d’écran, je peux lire l’historique et ouvrir l’explication sans perte de
   contenu, de focus ou de sens.
5. En tant qu’utilisatrice sensible aux animations, je peux activer la réduction
   du mouvement sans animation qui gêne la consultation ou l’action.

## Décisions validées

### Historique descriptif

- L’historique reste une section de l’accueil; aucune destination de navigation
  supplémentaire n’est créée.
- Un intervalle est la différence en jours civils entre deux débuts successifs
  enregistrés au plus tard aujourd’hui. Il ne représente pas la durée des règles.
- Les intervalles sont affichés du plus ancien au plus récent, avec les deux
  dates qui le délimitent et sa durée en jours.
- Un résumé indique le nombre d’intervalles et les durées minimale et maximale
  observées dans l’ensemble des intervalles passés. Il décrit les données; il ne
  qualifie pas leur régularité et ne produit aucun score.
- Les débuts après aujourd’hui, possibles dans une sauvegarde importée, sont
  listés séparément comme dates enregistrées à venir. Ils ne sont inclus ni dans
  les intervalles ni dans leur résumé.
- Les dates civiles et calculs réutilisent les fonctions du domaine; aucun
  timestamp local/UTC n’est introduit.
- Les états sans début passé, avec un seul début passé, et avec des dates futures
  seulement expliquent pourquoi aucun intervalle n’est encore listé.

### Explication de l’estimation existante

- Une divulgation native `<details>/<summary>` sur l’accueil explique les règles
  déjà implémentées, qu’une estimation soit disponible ou non.
- L’explication indique qu’un intervalle est mesuré entre deux débuts, que moins
  de trois intervalles ne donne pas d’estimation, que trois à cinq utilisent
  tous les intervalles disponibles, et que six ou plus utilisent les six plus
  récents.
- Elle définit la médiane comme la valeur centrale après classement, ou la
  moyenne des deux valeurs centrales si le nombre est pair; l’arrondi et la
  projection restent exactement ceux de la phase 2. Elle précise que la médiane
  arrondie est ajoutée au dernier début passé pris en compte et que les bornes
  de plage y projettent le minimum et le maximum observés.
- À partir de six intervalles, la plage affichée reste le minimum et le maximum
  des mêmes six intervalles récents. Elle ne constitue pas une garantie.
- Les débuts futurs restent exclus; une estimation passée ne glisse pas
  automatiquement. Le disclaimer existant demeure visible.
- La phase 2 reste l’unique source de vérité pour `estimateNextPeriod`; cette
  phase ne modifie ni les seuils, ni les dates calculées, ni le réglage stocké.

### Direction visuelle, UX et mouvement

- Conserver les tokens, les polices locales et la direction éditoriale de la
  phase 2. L’historique est une liste lisible avec séparateurs, pas une grille de
  cartes identiques.
- Garder l’accueil comme une seule colonne sur iPhone; les paires de dates et
  les durées peuvent se réorganiser sans défilement horizontal à 320 px.
- Utiliser le HTML natif pour la divulgation, une liste chronologique pour les
  intervalles, et des libellés textuels pour distinguer les dates à venir.
- Le seul nouveau mouvement est un retour d’appui bref (120 ms, transform) sur
  les contrôles pointables. Pas de transition de navigation, de calendrier ou
  d’entrée de liste; aucune animation ne retarde une action.
- Le mode `prefers-reduced-motion: reduce` supprime les déplacements et réduit
  les transitions résiduelles à une durée imperceptible. Aucune dépendance Motion
  n’est ajoutée pour cette finition.
- Respecter les états, la hiérarchie des titres, les zones de focus et les zones
  de sécurité iOS existants.

## Critères d’acceptation

- L’accueil présente tous les intervalles disponibles, en ordre chronologique,
  avec les deux débuts et la durée en jours.
- Le résumé compte les intervalles passés et affiche le minimum et le maximum
  observés sur l’ensemble de l’historique, pas seulement sur les six derniers.
- Avec zéro ou un début passé, une explication utile remplace la liste vide; une
  date future enregistrée est repérable séparément et n’affecte pas les valeurs
  historiques ou l’estimation.
- La divulgation est opérable au clavier et explique fidèlement les seuils et
  calculs existants pour moins de trois, trois à cinq et six intervalles ou plus.
- Les dates d’estimation, les libellés et les formules de phase 2 ne changent
  pas; aucun score de régularité, diagnostic, conseil ou méthode alternative
  n’est ajouté.
- L’historique et son résumé restent lisibles à 320 px, sans débordement
  horizontal, même avec un historique long.
- Les contrôles interactifs gardent un focus visible; le mouvement respecte
  `prefers-reduced-motion` et ne retarde ni la saisie ni la navigation.
- Un parcours Playwright observe l’historique, les dates futures, l’explication,
  l’usage clavier, l’absence de débordement et le mode de mouvement réduit; axe
  ne signale aucune violation sur les vues vérifiées.
- Une checklist iOS réelle couvre les nouveaux contenus et est marquée non
  exécutée tant qu’aucun iPhone n’est disponible.
- `npm test`, `npm run test:e2e`, `npm run test:timezones`, `npm run lint`,
  `npm run format:check` et `npm run build` passent.

## Seams de test

1. Fonction pure publique de l’historique, recevant les périodes et aujourd’hui :
   tri, intervalles civils, bornes descriptives et exclusion des dates futures.
2. Interface React observée par rôles, noms accessibles, textes, dates et focus :
   états vides, historique, explication et non-régression de l’estimation.
3. Parcours Playwright de l’application, via les contrôles utilisateurs : viewport
   étroit, historique fourni par le formulaire, divulgation clavier, axe et
   `prefers-reduced-motion`; aucun accès aux tables Dexie.
4. Checklist manuelle sur Safari/iOS réel : installation, défilement, VoiceOver,
   réduction du mouvement et persistance hors ligne; elle n’est pas remplaçable
   par Chromium émulé.

## Hors périmètre

- Moyenne, moyenne pondérée, comparaison de méthodes, validation rétrospective,
  nouvelle projection ou changement de l’estimation médiane et de sa plage.
- Seuils de régularité, traitement des cycles atypiques, diagnostic, conseil,
  ovulation, fertilité, contraception ou garantie de précision.
- Édition/suppression, réglages, import/export à l’écran, synchronisation,
  notifications, backend, compte ou analytics.
- Navigation animée, effets décoratifs, gestes et ajout d’une bibliothèque
  d’animation.
- Validation réelle sur iPhone dans cet environnement; elle est documentée pour
  la phase de validation appareil.
