# 08: Vérifier les parcours de phase 2 dans un navigateur

**Ce que l’utilisatrice peut faire :** compter sur les principaux parcours de
saisie, consultation et estimation après rechargement dans un vrai navigateur.

**Bloqué par :** 05 — Saisir un début et le retrouver sur l’accueil; 06 —
Parcourir les débuts dans le calendrier; 07 — Afficher l’estimation médiane et
sa plage.

**Statut :** terminé

- [x] Playwright et une commande de test navigateur sont configurés si
  nécessaire.
- [x] Un parcours part d’un profil navigateur vierge, enregistre des débuts,
  retrouve les dates dans le calendrier et observe les états d’estimation
  insuffisante puis disponible.
- [x] Un rechargement conserve les données et le parcours continue de fonctionner
  sans accès direct aux tables Dexie.
- [x] Les scénarios vérifient au moins un viewport étroit et l’usage clavier des
  actions principales.
- [x] Les tests de navigateur passent avec les contrôles unitaires, lint,
  formatage et build.
- [x] Une checklist manuelle d’installation et de réouverture PWA dans Safari
  iOS est fournie et signalée comme non exécutée sans appareil iOS réel.
