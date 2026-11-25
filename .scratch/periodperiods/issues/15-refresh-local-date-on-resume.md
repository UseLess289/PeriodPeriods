# 15: Actualiser la date civile au retour dans l’application

**Ce que l’utilisatrice peut faire :** enregistrer une période avec la date
locale correcte après avoir laissé l’application ouverte ou l’avoir reprise le
lendemain.

**Priorité :** P2 — correctif recommandé avant publication mobile. L’application
calcule `today` au rendu initial seulement; rester ouvert après minuit peut
laisser la date de saisie, les validations et les projections sur la veille.

**Statut :** prêt à réaliser.

**Fichiers concernés :** `src/App.tsx`, tests de `src/App.test.tsx` et
`e2e/phase-4.spec.ts`.

**Critères d’acceptation :**

- La date civile locale est recalculée au changement de jour et au retour de
  l’application après suspension ou changement d’onglet.
- La date saisie par défaut, les validations, le calendrier et les estimations
  utilisent la même date civile actualisée, sans décaler les dates par fuseau.
- Les abonnements d’horloge/visibilité sont nettoyés et ne laissent pas de timer
  actif redondant.

**Tests :** avancer l’horloge au-delà de minuit sans recharger; mettre l’onglet en
arrière-plan puis le reprendre après minuit; vérifier saisie, refus des dates
futures, calendrier et calcul d’estimation en fuseaux UTC et non UTC.
