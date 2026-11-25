# 04 — Fusionner accueil et calendrier, garder la saisie sur Accueil

**Navigation v1 :** validée au ticket 16. Les projections annuelles sont reportées.

**Résultat attendu :** Accueil regroupe l’estimation, son explication et le calendrier. La destination Calendrier devient Statistiques. Un bouton d'ajout central, visible au-dessus de la barre basse sur Accueil seulement, ouvre une fenêtre de saisie.

## Parcours

- Le bouton central permet d’ajouter un début, une durée indicative de cinq jours par défaut et des observations facultatives. Pour corriger ou supprimer une période, ouvre-la depuis le calendrier. Une correction conserve l’identifiant même si le début change; la suppression demande une confirmation qui nomme le début.
- La fenêtre s'ouvre avec le focus dedans, se ferme au clavier et rend le focus au bouton d'origine. Le fond n'est pas utilisable au clavier tant qu'elle est ouverte. Ne pas masquer le bas de la fenêtre sous la barre de navigation ou le clavier mobile.
- Le calendrier garde la navigation mensuelle et ajoute « Aujourd'hui » pour revenir au mois courant ; préciser si ce bouton ramène également le défilement sur le calendrier.
- `?view=calendar` ouvre Statistiques sans réécrire l’entrée d’historique du navigateur. Les commandes arrière et avant restaurent la destination correspondante. En revenant sur Accueil, le calendrier peut revenir au mois courant.

## Critères d'acceptation

- L’estimation précède le calendrier sur mobile et ordinateur ; les statistiques disposent d'une destination distincte.
- L'ajout est proposé sur Accueil uniquement, avec une confirmation visible et un calendrier mis à jour après réussite ; une période peut être corrigée sans créer un second début.
- « Aujourd'hui » ramène au mois courant, sans sélectionner ni enregistrer une date.
- Le parcours reste utilisable à 320 px, avec clavier, lecteur d'écran et zones de sécurité iOS.

**Fichiers concernés :** `src/App.tsx`, `src/features/periods/PeriodEntryView.tsx`, `src/features/calendar/PeriodCalendarView.tsx`, `src/features/shared/CompactDatePicker.tsx`, `src/index.css`, `src/App.test.tsx`, `e2e/phase-4.spec.ts`.

**Tests :** navigation directe (dont `?view=calendar`), retour et avance, focus et Échap de la fenêtre, échec de sauvegarde, doublons, date future, correction et suppression d'une période, ajout sur Accueil seulement, bouton Aujourd'hui, mobile et accessibilité Playwright.
