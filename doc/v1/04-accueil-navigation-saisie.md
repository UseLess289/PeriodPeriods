# 04 — Fusionner accueil et calendrier, rendre la saisie accessible partout

**Statut :** spécification en cours. **Bloqué par :** 01 ; 03 pour intégrer les projections définitives. **Débloque :** 05 et 06.

**Résultat attendu :** la page Accueil présente dans cet ordre l'estimation, son explication puis le calendrier. La destination Calendrier devient Statistiques. Un bouton d'ajout central, visible au-dessus de la barre basse sur chaque page, ouvre une fenêtre de saisie.

## Parcours

- Le bouton central ouvre une fenêtre pour saisir un début, une fin et des symptômes. La fin doit être facultative pour pouvoir enregistrer une période en cours ; les actions de validation, annulation et erreur réutilisent les règles de stockage existantes. Le sort des champs flux et notes reste à trancher au ticket 01.
- La fenêtre s'ouvre avec le focus dedans, se ferme au clavier et rend le focus au bouton d'origine. Le fond n'est pas utilisable au clavier tant qu'elle est ouverte. Ne pas masquer le bas de la fenêtre sous la barre de navigation ou le clavier mobile.
- Le calendrier garde la navigation mensuelle et ajoute « Aujourd'hui » pour revenir au mois courant ; préciser si ce bouton ramène également le défilement sur le calendrier.
- Les anciens liens `?view=calendar`, l'historique navigateur et les liens vers le calendrier sont redirigés ou adaptés selon une règle documentée ; ouvrir la page Statistiques ne doit pas perdre le mois consulté sans décision explicite.

## Critères d'acceptation

- L'estimation et son explication précèdent le calendrier sur mobile et ordinateur ; les statistiques disposent d'une destination distincte.
- L'ajout fonctionne depuis toutes les destinations, avec une confirmation visible et un calendrier mis à jour après réussite ; une période en cours peut recevoir sa fin et ses symptômes ultérieurement sans créer un second début.
- « Aujourd'hui » ramène au mois courant, sans sélectionner ni enregistrer une date.
- Le parcours reste utilisable à 320 px, avec clavier, lecteur d'écran et zones de sécurité iOS.

**Fichiers concernés :** `src/App.tsx`, `src/features/periods/PeriodEntryView.tsx`, `src/features/calendar/PeriodCalendarView.tsx`, `src/features/shared/CompactDatePicker.tsx`, `src/index.css`, `src/App.test.tsx`, `e2e/phase-4.spec.ts`.

**Tests :** navigation directe, retour et avance, focus et Échap de la fenêtre, échec de sauvegarde, doublons, date future, fin antérieure au début, modification d'une période en cours, ajout sur chaque destination, bouton Aujourd'hui, mobile et accessibilité Playwright.
