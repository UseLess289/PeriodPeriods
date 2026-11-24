# 07 — Ajouter les réglages retenus et une interface anglaise

**Statut :** spécification en cours. **Bloqué par :** 01, 02 si la méthode devient sélectionnable ; 04 à 06 pour traduire les nouveaux écrans.

**Résultat attendu :** choisir le français ou l'anglais, régler le premier jour de la semaine, retrouver ses préférences et utiliser des réglages qui modifient effectivement l'application. Les thèmes clair et sombre restent disponibles.

## Questions à trancher

- Le **premier jour de la semaine** est le réglage fonctionnel prioritaire ; `firstDayOfWeek` existe déjà dans le modèle mais n'est pas modifiable depuis Réglages. `forecastMethod` reste hors des contrôles tant qu'aucune méthode alternative n'est validée au ticket 02. Le thème clair/sombre existe et est conservé séparément dans `localStorage`.
- La langue suit-elle celle du navigateur au premier lancement ou démarre-t-elle en français ? Doit-elle être incluse dans la sauvegarde et restaurée à l'import ?
- Le choix du premier jour de semaine reste limité à **dimanche/lundi**, les deux valeurs actuellement prises en charge. Décider si le contrôle du thème reste dans l'en-tête, se déplace dans Réglages, ou apparaît aux deux endroits ; dans tous les cas, les thèmes clair et sombre doivent être cohérents avec la nouvelle palette.

## Critères d'acceptation

- Les textes visibles, messages d'erreur, dates, noms de mois et jours, noms accessibles, titre et description HTML existent en français et en anglais ; aucune page n'est à moitié traduite.
- Le premier jour de la semaine modifie immédiatement le calendrier et le sélecteur de date, persiste après rechargement et suit le contrat de sauvegarde décidé. Le choix clair/sombre reste persistant.
- Les sauvegardes JSON v1 existantes restent importables après ajout de champs, ou une migration versionnée et testée définit explicitement leur traitement.

**Fichiers concernés :** `src/domain/periods/index.ts`, `src/data/period-backup.ts`, `src/data/period-data-store.ts`, `src/features/settings/BackupSettingsView.tsx`, `src/features/shared/format-civil-date.ts`, `src/App.tsx`, `src/features/calendar/PeriodCalendarView.tsx`, `src/features/shared/CompactDatePicker.tsx`, `index.html`, `vite.config.ts` et catalogue de messages à créer sous `src/`.

**Tests :** réglages par défaut et persistés, import d'anciennes sauvegardes, changement de langue et de semaine dans les trois vues, dates et annonces accessibles, rechargement et fonctionnement hors ligne.
