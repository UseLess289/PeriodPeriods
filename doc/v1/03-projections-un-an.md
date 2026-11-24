# 03 — Montrer des projections conditionnelles sur un an

**Statut :** spécification en cours. **Bloqué par :** 01, 02. **Débloque :** 05.

**Résultat attendu :** consulter plusieurs débuts possibles sur l'année à venir en comprenant que chaque occurrence suppose que les estimations précédentes se réalisent. Il ne s'agit pas d'événements enregistrés.

## Comportement à préciser

- Partir de l'horizon arrêté au ticket 01 et produire toutes les occurrences qui y tombent. Conserver séparément les observations et les projections ; ne jamais enregistrer les dates calculées comme des périodes.
- Afficher l'hypothèse conditionnelle près de la série et dans son explication accessible. Définir comment la plage évolue à chaque occurrence selon la méthode validée au ticket 02 ; ne pas recopier une marge fixe sans justification.
- Prévoir l'état sans assez de données, les estimations centrales déjà passées, les changements d'historique et la dernière occurrence qui dépasse l'horizon.

## Critères d'acceptation

- La série est recalculée après l'ajout ou l'import de données et n'altère pas l'historique stocké.
- Chaque occurrence possède une date, une qualification d'estimation et l'incertitude que la méthode permet réellement de produire.
- Les libellés évitent toute promesse de date certaine ou d'observation de phase biologique.

**Fichiers concernés :** nouveau module dans `src/domain/forecast/`, `src/domain/dates/index.ts`, `src/features/periods/PeriodEntryView.tsx`, futurs composants de `src/features/stats/`.

**Tests :** propriété de monotonie des occurrences, horizon d'un an, 29 février, changements d'année et de fuseau, historique vide ou modifié, distinction accessible entre enregistré et projeté.
