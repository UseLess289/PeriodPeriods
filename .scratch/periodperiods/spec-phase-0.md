# PeriodPeriods - phase 0 specification

## Objective

Create the installable, mobile-first PWA shell for PeriodPeriods. The phase establishes the visual foundation and navigation, but does not yet record menstrual data or implement predictions.

## User stories

1. As a visitor, I want to open PeriodPeriods and understand its purpose immediately, so that I know what the application will help me do.
2. As a mobile user, I want to navigate between Accueil, Calendrier and Réglages, so that the future application has a clear structure.
3. As a privacy-conscious user, I want to see that the application is designed to work locally, so that I understand that no account is required.
4. As an iPhone user, I want to install the application from Safari and reopen it in standalone mode, so that it feels like an application.
5. As a user with reduced-motion preferences, I want the interface to remain usable without movement, so that the application does not cause discomfort.

## Scope

- React + TypeScript + Vite foundation.
- Tailwind CSS with explicit design tokens.
- Local Fraunces and IBM Plex Sans fonts.
- Mobile shell with header, main region and bottom navigation.
- Empty placeholders for the three destinations.
- Product-specific PWA metadata and generated service worker.
- ESLint, Prettier and Vitest setup.
- No real period entry, IndexedDB, prediction or remote service.

## Acceptance criteria

- `npm run build` succeeds.
- The app renders the PeriodPeriods shell at mobile width.
- Accueil, Calendrier and Réglages can be selected with touch and keyboard.
- The selected destination is announced semantically and visually.
- The app includes an installable manifest and generated service worker.
- The production preview can load the app after the first load without network access.
- There is one clear primary placeholder action for future period entry.
- Empty states explain what will become available and do not present fake data.
- Focus is visible and controls have accessible names.
- Reduced-motion preferences remove movement without removing feedback.

## Testing seams

- Rendered application shell: navigation and destination content.
- Production build: manifest and service worker output.
- Static analysis: lint and format checks.

## Out of scope

- Recording a period.
- IndexedDB or local data persistence.
- Forecast algorithms.
- Export/import.
- Notifications.
- HealthKit.
- Authentication or synchronization.
