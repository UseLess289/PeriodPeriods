# PeriodPeriods

Application web mobile-first de suivi des règles et du cycle menstruel. Le projet
utilise IndexedDB pour gérer localement les périodes et les réglages, avec des
sauvegardes JSON versionnées. La saisie, l’accueil, le calendrier et les
estimations descriptives sont disponibles; l’interface d’import/export reste à
construire.

## Développement

```bash
npm install
npm run dev
```

## Vérifications

```bash
npm test
npm run test:timezones
npx playwright install chromium
npm run test:e2e
npm run lint
npm run format:check
npm run build
npm run preview
```

Le build de production génère le manifeste et le service worker. Les ressources
de l’interface, y compris les polices, sont prévues pour le cache hors ligne.
L’installation depuis Safari et le shell hors ligne ont été vérifiés en phase 0.
Les parcours Playwright utilisent Chromium desktop et une émulation mobile. La
validation Safari/iOS sur appareil réel reste à exécuter; voir
`doc/validation-ios-phase-2.md`.

## Stack

- React, TypeScript et Vite
- Dexie et IndexedDB pour le stockage local; date-fns pour les dates civiles
- Tailwind CSS v4 et tokens CSS définis dans `src/index.css`
- Vitest et Testing Library
- `vite-plugin-pwa` pour le manifeste et le service worker
# PeriodPeriods
