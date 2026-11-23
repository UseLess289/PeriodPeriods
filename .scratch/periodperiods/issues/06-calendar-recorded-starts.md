# 06: Parcourir les débuts dans le calendrier

**Ce que l’utilisatrice peut faire :** parcourir les mois et retrouver les dates
de début enregistrées, y compris les dates futures provenant de données
importées.

**Bloqué par :** aucun — l’API de lecture des périodes et le réglage du premier
jour de semaine existent depuis la phase 1.

**Statut :** terminé

- [x] Le calendrier s’ouvre sur le mois courant et permet d’aller au mois
  précédent ou suivant.
- [x] Les jours de début enregistrés sont visuellement et sémantiquement
  distingués des jours ordinaires; aucun jour de règles n’est déduit de la durée
  facultative.
- [x] Le calendrier respecte `firstDayOfWeek` sauvegardé, avec lundi comme défaut.
- [x] Les états sans date, chargement et erreur récupérable sont compréhensibles
  et offrent une action utile lorsque nécessaire.
- [x] Les boutons de navigation, en-têtes et dates ont des noms accessibles; la
  navigation reste opérable au clavier sans cible transmise par la seule couleur.
- [x] Les comportements sont vérifiés par l’interface rendue et l’API publique,
  sans assertions liées à la structure interne des composants.
