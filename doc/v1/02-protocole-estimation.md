# Protocole d'estimation v1

La cible prédite est le **prochain début enregistré**, pas l'ovulation ni
l'existence d'un cycle ovulatoire. Le modèle de référence reste la médiane des
trois à six derniers intervalles, avec une plage min–max des six derniers
intervalles si six sont disponibles. Il n'est pas démontré qu'une autre méthode
soit supérieure sur les données de cette application.

## Évaluation locale

`backtestForecast` réévalue l'historique chronologiquement : après quatre
débuts connus, chaque prédiction utilise uniquement les dates antérieures au
début tenu à l'écart. Elle compare ensuite la date centrale à ce début et,
lorsqu'une plage existe, vérifie si elle le couvre. Les valeurs rapportées
sont l'erreur absolue médiane, le nombre de cycles évalués et la fraction
couverte par les plages disponibles. Elles décrivent les **saisies passées de
cette personne**, sans garantir une précision future. Une date de début
oubliée peut fausser aussi bien le modèle que son évaluation.

Les projections d'un an sont reportées hors v1. Le calcul interne est conditionnel : à chaque cycle, la durée
centrale est réutilisée et les bornes min–max des intervalles observés
s'additionnent. Leur écart s'élargit avec l'horizon. Ce sont des scénarios,
pas des intervalles de confiance calibrés ni une probabilité de grossesse.

## Limites des phases

Le début et la fin des règles permettent de situer une menstruation
**renseignée** et d'en décrire la durée. Les dates de règles seules ne
permettent pas de vérifier quand l'ovulation a eu lieu ni même si elle a eu
lieu. Les quatre segments d'un diagramme de cycle peuvent servir de repères
théoriques, mais aucune date ovulatoire ou période fertile ne doit être
présentée comme déterminée à partir de ces seules saisies.

Bull et al. ont étudié les longueurs de phases à partir de règles et de
mesures physiologiques (température et, parfois, tests LH), données que
PeriodPeriods ne recueille pas. Leur étude ne valide donc pas des frontières
personnelles calculées avec les seules dates de règles.

## Sources primaires

- Bull et al. (2019), *Real-world menstrual cycle characteristics of more
  than 600,000 menstrual cycles*, doi:10.1038/s41746-019-0152-7,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC6710244/
- Wilcox et al. (2000), *The timing of the fertile window in the menstrual
  cycle*, doi:10.1136/bmj.321.7271.1259,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC27529/
- Li et al. (2021), *A predictive model for next cycle start date that
  accounts for adherence in menstrual self-tracking*,
  doi:10.1093/jamia/ocab182,
  https://doi.org/10.1093/jamia/ocab182
