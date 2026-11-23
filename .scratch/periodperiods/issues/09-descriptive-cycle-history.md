# 09 : Consulter l’historique descriptif des intervalles

**Ce que l’utilisatrice peut faire :** retrouver sur l’accueil les intervalles
entre ses débuts passés, leur durée et l’étendue observée dans tout l’historique.

**Statut :** terminé

**Critères d’acceptation :**

- Les intervalles entre débuts jusqu’à aujourd’hui sont affichés du plus ancien
  au plus récent, avec leurs deux dates et leur nombre de jours.
- Le résumé affiche le nombre d’intervalles et leurs minimum et maximum sur tout
  l’historique; il ne donne aucun score ou jugement de régularité.
- Une liste vide explique qu’il faut deux débuts passés; zéro et un début ont un
  message adapté.
- Les débuts futurs enregistrés sont distingués et exclus de la liste et du
  résumé des intervalles.
- La fonction publique du domaine a des tests pour l’ordre, les jours civils,
  les limites et les dates futures.
- La présentation reste lisible avec un historique long et sur un viewport de
  320 px.

**Bloqué par :** 05 — Saisir un début; 07 — Afficher l’estimation médiane.

**Tests :** tests du domaine et tests d’interface observés par textes, dates et
rôles accessibles; aucune lecture directe de Dexie.
