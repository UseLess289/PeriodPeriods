# 02: Installable PWA and validation tooling

**What to build:** A user can install PeriodPeriods from Safari, reopen it as a standalone app and load the shell offline after the first successful visit.

**Blocked by:** 01 - Foundation shell and visual system.

**Status:** done

- [x] Product-specific manifest metadata, PNG icons and an Apple touch icon are configured.
- [x] `vite-plugin-pwa` generates and registers the service worker.
- [x] A production build succeeds.
- [x] Vitest, ESLint and Prettier scripts are available.
- [x] The built shell and local fonts are configured for precaching.
- [x] No application data or remote API is introduced.
- [x] Install from Safari on an iPhone and confirm standalone launch and app icon.
- [x] Confirm the production preview opens offline after one successful online load.
