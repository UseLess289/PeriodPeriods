# Notes de document

## A propos des méthodes d'estimation

Il n'y a pas de commun accord sur un algorithme qui serait plus précis que d'autres, mais on extrait des papiers lus quelques recommandations :

1. Utiliser les dates réelles de début de cycle
2. Calculer la durée entre deux dates de début de cycle
3. Exploiter l'historique personnel plutôt qu'un cycle théorique de 28 jours
4. Afficher l'incertitude
5. Ne pas déduire l'ovulation uniquement à partir de la date de début

Je propose d'implémenter dans un premier temps un algorithme médiane + intervalle historique pour sa simplicité, facilement implémentable en local et facile à améliorer.

La source [1] nous dis que les les algorithme des applications déjà existantes sont souvent propriétaires, peu transparant et parfois basés implicitement sur le modèle "Cycle de 28 jours".

La source [2] indique les applications sont génralement moins fiables pour les cycles irréguliers et que leurs algorithmes ne sont pas suffisament standardisés.

La source [3] propose un modèle génératif performant, basé sur le faite que l'utilisatrice peut oublier de renseigner les dates. Il nécéssite beaucoup de donné malgré tout

Aussi, en parcourant les papiers scientifiques, il semblerait qu'il y ait largement plus de recherches sur des algorithmes d'estimation de la période d'oculation ou de la fenêtre fertile. Enfin, cela semble logique mais il est très compliqué d'estimer les périodes de règles pour des utilisatrices à cycles irréguliers. Cela semble être un défi, où la source [3] semble donner de l'espoir. Malgré tout, le modèle présenté ne peut pas être directement utilisé en local.

## TODO
- ajouter une explication des trois phases selon les données renseignées : Proposition : sous 3 intervalles, aucune estimation; entre 3 et 5, médiane de tous les intervalles disponibles, projetée depuis le dernier début, avec confiance faible; à partir de 6, médiane des 6 intervalles les plus récents et plage min–max de ces mêmes intervalles, projetées depuis le dernier début. Aucun intervalle atypique n’est supprimé ni détecté automatiquement.
- ajouter les periodes d'ovulation et de fertilité
## Sources

[1]<https://pmc.ncbi.nlm.nih.gov/articles/PMC8504278/>
[2]<https://pmc.ncbi.nlm.nih.gov/articles/PMC11790291/>
[3]<https://arxiv.org/abs/2102.12439>
