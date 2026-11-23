# 07: Afficher l’estimation médiane et sa plage

**Ce que l’utilisatrice peut faire :** voir une estimation descriptive de son
prochain début lorsque son historique contient assez d’intervalles, sur
l’accueil et dans le calendrier.

**Bloqué par :** 05 — Saisir un début et le retrouver sur l’accueil; 06 —
Parcourir les débuts dans le calendrier.

**Statut :** terminé

- [x] Les durées de cycle sont calculées entre débuts successifs jusqu’à
  aujourd’hui inclus; les dates futures restent hors du calcul.
- [x] Avec moins de 3 intervalles, aucune date d’estimation n’est affichée.
- [x] Avec 3 à 5 intervalles, la médiane de tous les intervalles disponibles est
  projetée depuis le dernier début éligible et marquée comme confiance faible.
- [x] À partir de 6 intervalles, la médiane et les bornes min–max des 6
  intervalles les plus récents sont projetées depuis le dernier début éligible.
- [x] Une médiane fractionnaire est arrondie au jour le plus proche; les
  demi-journées sont arrondies vers le haut.
- [x] Une date estimée passée reste visible comme passée et ne se décale pas
  automatiquement; une nouvelle date de début recalcule l’estimation.
- [x] Les jours enregistrés, la date médiane et les bornes de plage sont
  distincts sans dépendre uniquement de la couleur.
- [x] Des tests de domaine indépendants de React couvrent les seuils, les dates
  civiles, les débuts futurs, l’arrondi et les estimations passées.
- [x] Aucun intervalle n’est exclu ou qualifié d’atypique; aucune règle médicale,
  d’ovulation ou de fertilité n’est ajoutée.
