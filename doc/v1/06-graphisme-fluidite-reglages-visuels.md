# 06 — Refaire le graphisme, la fluidité et la présentation des réglages

**Statut :** spécification en cours. **Bloqué par :** 01, 04, 05 ; coordonner avec 07.

**Résultat attendu :** une hiérarchie naturelle entre estimation, calendrier, statistiques et actions ; des contrôles de Réglages cohérents ; des interactions rapides et prévisibles sur téléphone. La direction visuelle s'inspire d'Apple Calendrier avec une palette rose pastel et deux thèmes, clair et sombre.

## Travail prévu

- Préparer une référence visuelle inspirée d'Apple Calendrier : grille et repères nets, tons roses pastel, hiérarchie sobre. Définir la palette des phases estimées une fois leur sens fixé ; réviser les tokens, typographies, espacements, contrastes et états dans les deux thèmes avant de styliser les écrans. Reprendre les principes demandés, sans copier des éléments graphiques propriétaires à l'identique.
- Présenter les entrées de Réglages avec un même langage de lignes : nom, valeur ou action, aide et état, plutôt que des styles divergents pour fichiers et préférences.
- Décrire les gestes ou transitions ressentis comme peu fluides, puis mesurer les parcours concernés sur un appareil représentatif avant d'attribuer une cause. La navigation, le sélecteur de date et le balayage du calendrier sont les premiers parcours à examiner.
- Garder les changements d'état immédiats et respecter `prefers-reduced-motion`. Vérifier la fenêtre d'ajout avec clavier mobile et zones de sécurité.

## Critères d'acceptation

- Une maquette décline cette direction en thèmes clair et sombre et fixe la composition, les couleurs et les états importants avant l'intégration.
- Les écrans restent utilisables à 320 px, en mode sombre, avec agrandissement du texte et contraste suffisant.
- Les parcours ciblés sont comparés avant/après ; aucune animation ne retarde une saisie ou masque un état.

**Fichiers concernés :** `src/index.css`, `src/App.tsx`, `src/features/settings/BackupSettingsView.tsx`, `src/features/calendar/PeriodCalendarView.tsx`, composants nouveaux des tickets 04 et 05.

**Tests :** contrôle visuel mobile et ordinateur, axe, parcours au clavier, thème sombre, `prefers-reduced-motion`, défilement et contrôle réel Safari/iPhone. Mesurer avant de conclure à un gain de performance.
