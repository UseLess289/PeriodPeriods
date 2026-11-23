# PeriodPeriods — spécification de la phase 2

## Problème

Le shell PWA et les APIs locales de période sont en place, mais aucune donnée ne
peut encore être saisie ou consultée dans l’interface. L’utilisatrice ne peut
donc pas suivre ses dates, parcourir son calendrier ni voir une estimation
descriptive basée sur son historique.

## Solution

Construire un parcours local de bout en bout : saisir un début de règles,
retrouver les dates enregistrées dans un calendrier mensuel, et afficher une
estimation médiane accompagnée d’une plage lorsque l’historique le permet.
L’application continue de fonctionner sans compte ni service distant.

## Histoires utilisateur

1. En tant qu’utilisatrice sans historique, je peux enregistrer un premier jour
   et comprendre que plusieurs dates sont nécessaires avant toute estimation.
2. En tant qu’utilisatrice, je peux enregistrer aujourd’hui ou rattraper une date
   passée sans fournir de détails facultatifs.
3. En tant qu’utilisatrice, je peux voir le dernier début enregistré sur
   l’accueil et toutes les dates dans le calendrier.
4. En tant qu’utilisatrice, je peux parcourir les mois précédents et suivants et
   comprendre quelles dates sont enregistrées, estimées ou dans la plage estimée.
5. En tant qu’utilisatrice avec assez d’historique, je peux consulter la date
   médiane estimée, la plage historique et le niveau de confiance associé.
6. En tant qu’utilisatrice, je peux comprendre qu’une estimation passée reste
   une estimation passée et ne se décale pas automatiquement.
7. En tant qu’utilisatrice, je peux corriger une erreur de saisie en gardant ma
   date dans le formulaire si l’enregistrement échoue.
8. En tant qu’utilisatrice au clavier ou avec un lecteur d’écran, je peux
   parcourir les destinations, le formulaire et le calendrier avec des noms,
   états et retours compréhensibles.

## Décisions d’implémentation et de comportement

### Modèle et persistance

- Réutiliser le modèle `Period` et l’API publique `PeriodDataStore` de la phase
  1. Aucun changement de schéma ni duplication du CRUD n’est prévu.
- Une saisie crée un début de période uniquement. La fin, le flux, les symptômes
  et la note restent hors du formulaire de phase 2.
- Le formulaire propose la date civile locale du jour par défaut et refuse une
  date postérieure à aujourd’hui. Les dates passées sont permises.
- Un début déjà enregistré est refusé avec un message explicite. Une erreur de
  stockage conserve la valeur saisie et permet de réessayer.
- Le dernier début enregistré est montré sur l’accueil. Toutes les périodes
  restent consultables dans le calendrier, y compris celles importées avec une
  date future.
- Les réglages déjà stockés restent inchangés. La phase 2 utilise la médiane
  même si une sauvegarde importée contient une autre valeur de
  `forecastMethod`; aucun sélecteur de méthode n’est ajouté.

### Estimation descriptive

- Un cycle est l’intervalle en jours civils entre deux débuts successifs.
- Seuls les débuts jusqu’à aujourd’hui inclus sont pris en compte. Les données
  futures restent visibles dans le calendrier mais ne changent pas l’estimation.
- Avec moins de 3 intervalles, aucune estimation n’est affichée; l’accueil invite
  à continuer l’enregistrement.
- Avec 3 à 5 intervalles, la date centrale est la médiane de tous les
  intervalles disponibles et est présentée avec une confiance faible.
- Avec 6 intervalles ou plus, la date centrale est la médiane des 6 intervalles
  les plus récents. La plage est obtenue en ajoutant au dernier début éligible
  respectivement le minimum et le maximum de ces mêmes 6 intervalles.
- Si la médiane est fractionnaire, elle est arrondie au jour le plus proche; une
  demi-journée est arrondie vers le haut.
- Aucune durée n’est supprimée comme atypique, aucune irrégularité n’est
  diagnostiquée et aucun seuil clinique n’est ajouté.
- Une estimation passée est conservée, explicitement marquée comme passée; elle
  n’est pas projetée à nouveau depuis aujourd’hui. Une nouvelle date enregistrée
  recalcule l’estimation à partir du nouvel historique.
- Les dates d’estimation et les bornes de plage sont des dates civiles
  `YYYY-MM-DD`; les calculs ne dépendent pas du fuseau horaire ou du DST.

### Accueil et calendrier

- L’accueil expose une action principale pour saisir un début, le dernier début
  enregistré, l’état de chargement/erreur/réussite et l’estimation si disponible.
- Le calendrier s’ouvre sur le mois courant et permet d’avancer ou reculer d’un
  mois. Le premier jour de semaine suit `firstDayOfWeek` sauvegardé (lundi par
  défaut).
- Le calendrier marque les seuls jours de début enregistrés; il ne déduit pas
  la durée des règles à partir de `endDate` et n’invente pas de jours de règles.
- Les dates enregistrées, la date centrale estimée et les bornes de plage ont des
  signaux visuels et textuels distincts; leur sens n’est jamais communiqué par
  la couleur seule. Les libellés des jours rendent ces informations accessibles
  aux technologies d’assistance.
- Les vues Réglages, export/import, édition et suppression restent hors de cette
  phase et conservent leurs états placeholders actuels.

### Direction d’interface

- Conserver le vocabulaire visuel « calme éditorial organique » existant :
  toile `#f6f1e8`, surface `#fffdf9`, encre `#282625`, texte secondaire `#716b64`,
  accent `#b95f4e`, focus `#2b6d78`.
- Garder Fraunces pour les dates et titres, IBM Plex Sans pour les contrôles et
  textes. La composition mobile reste sur une colonne avec la navigation basse
  et les zones de sécurité iOS existantes.
- Faire de la date et de sa relation au calendrier le point distinctif :
  hiérarchie éditoriale sobre et marques calendaires explicites, sans reprendre
  le placeholder décoratif du shell, sans cartes uniformes ni animation
  décorative.
- Conserver le focus visible, les cibles tactiles confortables et le respect de
  `prefers-reduced-motion`.

## Critères d’acceptation

- Le premier lancement présente un état vide utile et une action active de saisie.
- Une date valide passée ou présente est conservée localement après rechargement;
  la date du jour est proposée par défaut.
- Une date future ou un doublon ne crée aucune donnée et produit un message
  compréhensible; une erreur de stockage n’efface pas la saisie.
- L’accueil reflète les données persistées et présente les états vides,
  chargement, erreur récupérable et succès.
- Le calendrier mensuel montre les débuts enregistrés, suit le réglage du premier
  jour de semaine et permet la navigation entre mois.
- Moins de 3 intervalles n’affiche aucune date estimée; 3 à 5 affichent la
  médiane avec confiance faible; 6 ou plus affichent médiane et plage selon les
  formules ci-dessus.
- Les intervalles, les dates projetées, les médianes fractionnaires, les dates
  futures importées et les estimations passées ont des tests déterministes.
- Aucun calcul ne produit de date d’ovulation, de fenêtre fertile, de diagnostic
  ou de certitude médicale.
- Les tests d’interface vérifient les comportements par rôles/noms accessibles;
  les parcours Playwright couvrent l’ajout, le calendrier, l’estimation et la
  persistance après rechargement sans inspecter les tables Dexie.
- `npm test`, `npm run lint`, `npm run format:check` et `npm run build` passent.
  Le parcours Playwright est ajouté à la validation de phase 2; la vérification
  iOS réelle reste une validation manuelle sur appareil.

## Seams de test approuvés

1. Fonction publique pure du domaine recevant des périodes et une date du jour
   explicite; vérifie les seuils, médiane, plage, arrondi et dates civiles sans
   React ni Dexie.
2. API publique `PeriodDataStore` pour ajout/lecture/persistance; tests IndexedDB
   simulée par la même approche que la phase 1.
3. Interface rendue et parcours Playwright observés par les contrôles et contenus
   accessibles; aucun accès direct aux tables Dexie dans les tests de parcours.

## Hors périmètre

- Méthodes moyenne ou pondérée, préférences de méthode et réglages.
- Seuil d’irrégularité, détection ou exclusion de cycles atypiques, correction
  automatique, conseil ou règle médicale.
- Ovulation, fertilité, contraception, diagnostic ou affirmation de précision.
- Édition/suppression des périodes, saisie de détails, export/import à l’écran,
  notifications, synchronisation, compte, backend ou analytics.
- Finition d’animations et validation complète sur iPhone réel (phase 3/4).

## Risques et notes

- Une date estimée est descriptive et ne constitue ni une promesse ni une
  méthode contraceptive. Le texte d’interface doit maintenir cette distinction.
- Une sauvegarde peut contenir des dates futures ou une méthode non médiane; le
  comportement phase 2 ci-dessus doit rester explicite et ne pas réécrire ces
  valeurs.
- Le dépôt fourni n’a pas de métadonnées Git; le diff final ne pourra pas être
  comparé à un commit de base sans rétablir un dépôt Git.
