# PeriodPeriods - workflow de réalisation

Ce document précise quels skills OpenCode utiliser, dans quel ordre et pour quel livrable. Le principe est de ne pas invoquer tous les skills à chaque message : chaque skill intervient à un moment précis du cycle.

## 1. Règle générale

Pour chaque phase importante :

```text
Clarifier → Spécifier → Découper → Implémenter → Tester → Revoir → Valider
```

La chaîne courte est :

```text
grill-with-docs (si nécessaire)
        ↓
to-spec
        ↓
to-tickets
        ↓
implement + tdd
        ↓
reviewing-interface-quality / web-design-guidelines
        ↓
code-review
```

Les skills de design et d'accessibilité s'invoquent seulement lorsqu'une phase touche l'interface.

## 2. Tableau des skills

| Skill | À invoquer quand | Livrable attendu |
|---|---|---|
| `grill-with-docs` | Une décision produit ou technique reste ambiguë | Décisions clarifiées, vocabulaire, questions fermées |
| `to-spec` | Une phase comporte plusieurs comportements à construire | Spécification avec user stories et critères d'acceptation |
| `to-tickets` | La spécification est approuvée | Tickets verticaux avec dépendances |
| `frontend-design` | Avant de créer ou modifier une interface | Direction visuelle, brief, tokens et composition |
| `designing-user-experience` | Pour les parcours, formulaires et états | Flux utilisateur, validations, états vide/erreur/succès |
| `building-accessible-interfaces` | Pour tout composant interactif | Labels, focus, clavier, contraste, reduced motion |
| `emil-design-eng` | Pour les micro-interactions et la finition | Décisions de motion sobres et cohérentes |
| `review-animations` | Après implémentation d'animations | Rapport et corrections de qualité/performance |
| `tdd` | Pour le domaine, les dates, les algorithmes et les règles | Tests écrits avant ou avec l'implémentation |
| `implement` | Quand un ticket possède des critères acceptés | Code fonctionnel et tests associés |
| `reviewing-interface-quality` | Quand un écran est fonctionnel mais doit être poli | Audit visuel et liste de corrections |
| `web-design-guidelines` | Avant de considérer l'interface prête | Audit règles web, UX, responsive et accessibilité |
| `code-review` | Après une phase ou un groupe de tickets | Revue des standards et de la conformité à la spec |

## 3. Comment invoquer les skills

Pour les skills de workflow, utiliser la commande correspondante si elle est disponible :

```text
/grill-with-docs
/to-spec
/to-tickets
/tdd
/implement
/code-review
```

Pour les skills de conseil, les mentionner explicitement dans la demande :

```text
Utilise @frontend-design pour préparer la direction visuelle.
Utilise @designing-user-experience pour vérifier le parcours.
Utilise @building-accessible-interfaces avant de valider cet écran.
Utilise @emil-design-eng pour concevoir cette micro-interaction.
Utilise @review-animations pour auditer les animations.
Utilise @reviewing-interface-quality pour faire la revue visuelle finale.
Utilise @web-design-guidelines pour l'audit des règles web.
```

Si OpenCode ne reconnaît pas la syntaxe `/`, demander directement : `Charge le skill to-spec et applique son workflow.`

## 4. Phase A - cadrage d'une phase

### Quand l'utiliser

Avant de commencer une phase qui dépasse une petite correction isolée.

### Skills

1. `grill-with-docs`, uniquement si des choix sont encore flous.
2. `to-spec`, pour transformer le besoin en spécification exploitable.

### Travail attendu

- relire le plan v0 ;
- définir le comportement utilisateur attendu ;
- expliciter les cas vides et les erreurs ;
- lister ce qui est hors périmètre ;
- définir des critères d'acceptation observables ;
- identifier les risques techniques ou produit.

### Passage à la suite

La phase est cadrée lorsque chaque comportement possède un résultat attendu et qu'aucune décision bloquante ne reste implicite.

## 5. Phase B - découpage en tickets

### Skill

`to-tickets`

### Règles

- un ticket doit être démontrable seul ;
- privilégier une tranche verticale complète plutôt qu'un découpage par couche ;
- chaque ticket indique ses dépendances ;
- éviter les tickets trop petits qui ne produisent aucun comportement ;
- éviter un ticket « construire toute l'application ».

### Format recommandé

```text
Titre
Ce que l'utilisateur peut faire après ce ticket
Critères d'acceptation
Blocked by
Tests de vérification
```

Pour PeriodPeriods, les tickets peuvent rester dans `.scratch/periodperiods/issues/` au début. Aucun tracker distant n'est requis.

### Passage à la suite

Le découpage est validé lorsque la granularité, l'ordre et les dépendances sont approuvés. Ne pas lancer `implement` avant cette validation.

## 6. Phase C - réalisation d'un ticket

### Avant le code

Si le ticket touche l'interface :

1. `frontend-design` pour la direction visuelle et les tokens ;
2. `designing-user-experience` pour le parcours et les états ;
3. `building-accessible-interfaces` pour les exigences d'accessibilité.

Si le ticket touche le domaine ou les algorithmes :

1. `tdd` pour définir les cas de test ;
2. `implement` pour réaliser le ticket.

### Pendant le code

- ne pas ajouter une dépendance sans raison documentée ;
- conserver les calculs dans `domain/`, indépendants de React ;
- conserver les dates civiles au format `YYYY-MM-DD` ;
- vérifier les états de chargement, vide, erreur et succès ;
- tester le comportement utilisateur, pas seulement l'existence des composants.

### Pour une animation

1. `emil-design-eng` pour décider si l'animation est nécessaire ;
2. utiliser CSS pour les transitions simples ;
3. utiliser `motion` uniquement pour les entrées/sorties, gestes ou changements de layout ;
4. tester `prefers-reduced-motion` ;
5. invoquer `review-animations` après l'implémentation.

### Passage à la suite

Le ticket est terminé lorsque ses critères d'acceptation sont vérifiés, les tests passent et aucune régression évidente n'est présente.

## 7. Phase D - revue d'interface

À utiliser lorsqu'un ou plusieurs tickets ont produit un écran utilisable.

### Ordre

1. `reviewing-interface-quality` : cohérence visuelle, hiérarchie, densité, finition.
2. `web-design-guidelines` : règles web, responsive, accessibilité et UX.
3. `building-accessible-interfaces` : vérification approfondie des composants interactifs.
4. `review-animations` : uniquement si des animations ont été ajoutées.

### Vérifications minimales

- écran étroit d'iPhone ;
- textes longs et données absentes ;
- gros historique ;
- erreurs de saisie ;
- navigation sans souris ;
- focus visible ;
- contraste suffisant ;
- reduced motion ;
- aucune animation qui retarde une action fréquente.

## 8. Phase E - validation technique

### Skills

1. `tdd` pour compléter les cas manquants sur le domaine.
2. `code-review` pour comparer le résultat au ticket et aux standards.

### Tests à exécuter

```bash
npm run test
npm run build
npm run lint
npx playwright test
```

Les scripts exacts seront confirmés lors de la création du projet Vite.

### Vérification PWA sur iPhone

- ouvrir la version HTTPS dans Safari ;
- ajouter à l'écran d'accueil ;
- créer une donnée ;
- fermer et rouvrir l'application ;
- couper le réseau ;
- vérifier que la consultation et la saisie locale fonctionnent encore ;
- vérifier qu'aucune donnée métier n'est envoyée dans une requête réseau.

### Passage à la suite

La phase est validée seulement si le build, les tests et le parcours offline passent, et si les écarts trouvés par les revues sont corrigés ou explicitement acceptés.

## 9. Application aux phases de PeriodPeriods

### Phase 0 - fondation PWA

- `to-spec` puis `to-tickets` ;
- `frontend-design` pour les tokens et le shell mobile ;
- `implement` pour Vite, le manifest et le service worker ;
- `web-design-guidelines` et `code-review`.

### Phase 1 - domaine et persistance

- `to-spec` si le modèle ou l'export évolue ;
- `tdd` pour les dates, Dexie et l'import/export ;
- `implement` ;
- `code-review`.

### Phase 2 - accueil, saisie et calendrier

- `to-spec` puis `to-tickets` ;
- `frontend-design` ;
- `designing-user-experience` ;
- `building-accessible-interfaces` ;
- `tdd` pour les estimations ;
- `implement` ;
- `reviewing-interface-quality` ;
- `web-design-guidelines` ;
- `code-review`.

### Phase 3 - finition et animations

- `emil-design-eng` ;
- `implement` ;
- `review-animations` ;
- `reviewing-interface-quality` ;
- `building-accessible-interfaces` pour le reduced motion ;
- `code-review`.

### Phase 4 - validation iPhone et release candidate

- `to-tickets` uniquement si des corrections sont suffisamment nombreuses pour être suivies ;
- `tdd` pour les régressions ;
- `web-design-guidelines` ;
- `reviewing-interface-quality` ;
- `code-review` ;
- test manuel sur l'iPhone réel.

## 10. Definition of Done d'une phase

Une phase est considérée comme terminée lorsque :

- sa spécification et ses critères d'acceptation sont connus ;
- ses tickets sont découpés et leurs dépendances explicites ;
- le comportement utilisateur fonctionne de bout en bout ;
- les tests pertinents passent ;
- les états vide, erreur et données atypiques ont été vérifiés ;
- l'accessibilité et le reduced motion ont été contrôlés si l'interface est concernée ;
- les animations ont été revues si elles existent ;
- le build PWA fonctionne ;
- `code-review` n'a pas identifié de problème bloquant ;
- les décisions repoussées sont documentées au lieu d'être implicitement ajoutées.

## 11. Anti-patterns à éviter

- invoquer `frontend-design` après avoir déjà écrit toute l'interface ;
- utiliser `to-tickets` avant que le comportement attendu soit compris ;
- découper les tickets par fichiers ou par couches techniques ;
- ajouter Motion ou GSAP uniquement pour rendre l'écran « plus vivant » ;
- ignorer les états sans données ;
- tester uniquement Chrome desktop ;
- considérer une review visuelle comme un remplacement des tests fonctionnels ;
- publier ou envoyer des données de santé vers un service pour faciliter les tests.



Tâche	Modèle
Exploration rapide	gpt-6-luna, medium
to-spec	gpt-6.1-terra, high
to-tickets	gpt-6.1-terra, medium
Implémentation normale	gpt-6.1-terra, high
Design frontend	gpt-6.1-terra, high
Algorithmes menstruels	gpt-6.2-sol, high
Debugging difficile	gpt-6.2-sol, high
Revue finale	gpt-6.2-sol, medium/high
Tâches triviales	gpt-6-luna, low/medium
