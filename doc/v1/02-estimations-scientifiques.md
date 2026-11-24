# 02 — Évaluer et améliorer les estimations

**Statut :** spécification en cours. **Bloqué par :** 01. **Débloque :** 03 et 05.

**Résultat attendu :** une estimation compréhensible dont les règles et la qualité mesurée sur des historiques passés sont explicites. Ne pas qualifier une nouvelle méthode de meilleure avant comparaison.

## Travail prévu

- Décrire la méthode actuelle : dates de début passées, médiane des six derniers intervalles disponibles, seuil de trois intervalles, plage min–max à partir de six ; identifier ses limites et définir des méthodes candidates.
- Établir une revue de littérature et un protocole avant l'implémentation : population concernée, historique minimal, mesures d'erreur des dates et de couverture des plages, traitement des cycles atypiques et des historiques lacunaires. Documenter les sources et les limites de généralisation.
- Effectuer une évaluation chronologique : pour chaque point évaluable, entraîner uniquement sur les dates antérieures et comparer à la date suivante réellement enregistrée. Séparer le jeu d'exploration de l'évaluation finale ; rapporter les résultats par quantité d'historique et variabilité, sans sélectionner une méthode sur ses propres exemples de démonstration.
- Décider si `forecastMethod` devient un choix actif, reste interne ou disparaît du modèle après décision du ticket 01. Synchroniser l'explication de l'interface avec l'algorithme effectivement choisi.
- Définir séparément le calcul et les limites des quatre phases demandées (menstruelle, folliculaire, ovulatoire, lutéale). Préciser ce que les débuts et fins renseignés permettent réellement d'estimer et ce qui demeure inconnu sans observation supplémentaire. Ne pas confondre l'évaluation d'une date de début de règles avec une validation des phases biologiques.

## Critères d'acceptation

- Les baselines, métriques, conditions d'éligibilité et résultats reproductibles sont documentés avant d'annoncer une amélioration.
- Une méthode retenue produit des sorties déterministes indépendantes de React ; aucune date future importée ne participe à son évaluation ou à son calcul.
- Les intervalles atypiques ne sont pas supprimés silencieusement et les données insuffisantes ne donnent pas de fausse précision.
- L'explication visible décrit exactement les seuils et calculs réellement utilisés.
- Une phase affichée est qualifiée d'estimée, et la représentation d'une phase ovulatoire n'affirme ni date d'ovulation observée ni fiabilité contraceptive.

**Fichiers concernés :** `src/domain/forecast/estimate-next-period.ts`, `src/domain/forecast/estimate-next-period.test.ts`, `src/domain/history/get-cycle-history.ts`, `src/domain/periods/index.ts`, `src/features/periods/PeriodEntryView.tsx` ; protocole et résultats à documenter sous `doc/v1/`.

**Tests :** cas réguliers, irréguliers, atypiques et courts ; évaluation sans fuite temporelle ; calcul des phases avec débuts et fins connus ou absents ; dates civiles, fuseaux et années bissextiles via `npm test` et `npm run test:timezones`. L'interface ne doit pas présenter une estimation comme un constat médical.
