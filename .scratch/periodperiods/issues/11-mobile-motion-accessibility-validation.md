# 11 : Finir l’expérience mobile, le mouvement et sa validation

**Ce que l’utilisatrice peut faire :** consulter l’historique sur petit écran et
utiliser les contrôles sans mouvement gênant, au clavier ou avec un lecteur
d’écran.

**Statut :** terminé — checklist appareil réel non exécutée (phase 4).

**Critères d’acceptation :**

- L’historique ne déborde pas à 320 px; les cibles, le focus et la navigation
  basse conservent les comportements attendus.
- Le retour d’appui est bref et limité aux contrôles; la navigation et les mises
  à jour de liste restent immédiates.
- `prefers-reduced-motion` supprime les déplacements et neutralise les
  transitions résiduelles.
- Les parcours Playwright vérifient le mode réduit, l’usage clavier, l’absence de
  débordement et axe sur l’historique et l’explication.
- Une checklist `doc/validation-ios-phase-3.md` décrit les vérifications réelles
  Safari/iOS et indique explicitement qu’elles ne sont pas exécutées ici.
- Tests, e2e, dates multi-fuseaux, lint, formatage et build passent.

**Bloqué par :** 09 — Historique descriptif; 10 — Explication de la médiane.

**Tests :** Playwright desktop et iPhone émulé, axe, vérification clavier, mode
réduit et largeur étroite; checklist manuelle pour Safari sur iPhone réel.
