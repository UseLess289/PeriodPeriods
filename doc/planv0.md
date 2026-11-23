# PeriodPeriods - plan v0

> Plan technique et produit pour une première version fonctionnelle, locale et installable comme PWA.

## 1. Décision en une phrase

Construire une **PWA mobile-first en React + TypeScript + Vite**, sans backend, avec une base locale IndexedDB, une interface éditoriale calme et lisible, et des animations limitées aux changements d'état utiles.

L'objectif de v0 n'est pas de produire une application médicale complète. C'est de valider trois choses :

1. l'expérience de saisie des règles sur iPhone ;
2. la compréhension d'une estimation présentée comme une plage ;
3. la confiance apportée par une application locale, transparente et sans compte.

## 2. Contraintes non négociables

- Les données de santé restent locales par défaut.
- Respect de la vie privée, RGPD, CNIL
- Aucun compte, aucun backend, aucun analytics distant
- L'application doit fonctionner hors ligne après son premier chargement.
- L'interface doit être utilisable au pouce sur un iPhone X or later.
- Les dates sont stockées comme chaînes `YYYY-MM-DD`, pas comme timestamps UTC.
- Les algorithmes de prédiction sont du code TypeScript pur, indépendant de React et testable séparément.
- Une prédiction est une estimation, jamais une promesse ni une méthode contraceptive.
- Les incertitudes sur les valeurs renvoyées seront soigneusement affichées et expliquées
- Toute animation respecte `prefers-reduced-motion` et ne bloque jamais une interaction.

## 3. Stack retenue

### Application

| Besoin           | Choix                                  | Pourquoi                                                                          |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Framework UI     | React                                  | Composants fonctionnels, écosystème mature, bon support mobile web                |
| Langage          | TypeScript                             | Modèles de données et algorithmes plus sûrs                                       |
| Build/dev server | Vite                                   | Rapide, simple, adapté à une PWA statique                                         |
| PWA              | `vite-plugin-pwa`                      | Génération du manifest, service worker et gestion des mises à jour                |
| Styling          | Tailwind CSS + CSS variables           | Tokens explicites, responsive mobile-first, peu de CSS dispersé                   |
| Primitives UI    | shadcn/ui seulement au besoin          | Composants accessibles et possédés par le projet, sans imposer un thème générique |
| Icônes           | `lucide-react`                         | SVG cohérents, légers et accessibles                                              |
| Stockage local   | Dexie.js sur IndexedDB                 | Données structurées, requêtes simples, meilleure base que `localStorage`          |
| Dates            | `date-fns`                             | Calculs et formatage explicites ; éviter les manipulations manuelles              |
| Animation        | `motion` pour React, parcimonieusement | Entrées/sorties, gestes et transitions de layout ; CSS pour les effets simples    |
| Tests unitaires  | Vitest                                 | Rapide, adapté au code TypeScript et à Vite                                       |
| Tests navigateur | Playwright                             | Parcours utilisateur et vérifications responsive/offline                          |
| Déploiement      | Netlify ou Cloudflare Pages            | Hébergement statique HTTPS, sans backend applicatif                               |

### Dépendances volontairement exclues de v0

- Next.js : SSR et backend inutiles pour une PWA locale statique.
- React Native / Expo : distribution iOS plus complexe et pas nécessaire pour valider le concept.
- GSAP : trop puissant pour les quelques transitions prévues.
- Framer Motion : utiliser le paquet actuel `motion` et l'import `motion/react`, pas deux bibliothèques d'animation concurrentes.
- Redux/Zustand : commencer avec React state + hooks ciblés ; ajouter un store seulement si un besoin concret apparaît.
- Backend, authentification, synchronisation et analytics : hors périmètre v0.

## 4. Direction visuelle

### Direction choisie

**Calme éditorial organique** : une application intime, sérieuse et chaleureuse, mais pas infantilisante ni stéréotypée.

- Fond chaud légèrement cassé plutôt que blanc pur.
- Encre sombre et contrastée.
- Un accent terracotta/corail pour les événements menstruels.
- Une couleur secondaire sobre pour les états informatifs.
- Peu de cartes flottantes et pas de dégradé violet/bleu par défaut.
- Une hiérarchie forte : date et prochaine estimation très visibles, détails secondaires discrets.

### Typographie proposée

- Titres et grandes dates : **Fraunces**.
- Texte, contrôles et données : **IBM Plex Sans**.
- Polices embarquées dans le bundle via `@fontsource`, sans dépendance à Google Fonts ni au réseau après installation.

### Structure d'écran v0

1. **Accueil / Aujourd'hui**
   - prochaine plage estimée ;
   - dernière période enregistrée ;
   - bouton primaire `Enregistrer le début des règles` ;
   - indication de confiance et lien vers l'explication.
2. **Calendrier**
   - historique des débuts ;
   - plage estimée visuellement différenciée des dates confirmées ;
   - navigation mensuelle simple.
3. **Historique**
   - durées des cycles ;
   - variabilité ;
   - méthode active et alternatives détaillées.
4. **Réglages**
   - export JSON ;
   - import JSON ;
   - suppression locale ;
   - préférence de méthode ;
   - explication de la confidentialité.

Navigation : barre basse sur mobile, avec trois destinations principales `Accueil`, `Calendrier`, `Réglages`. L'historique peut être une section de l'accueil en v0 pour limiter la navigation.

## 5. Architecture de code

```text
src/
├── app/
│   ├── App.tsx
│   ├── routes.ts
│   └── pwa/
├── components/
│   ├── ui/
│   └── layout/
├── features/
│   ├── calendar/
│   ├── periods/
│   ├── forecast/
│   └── settings/
├── data/
│   ├── db.ts
│   ├── repositories.ts
│   └── export-import.ts
├── domain/
│   ├── cycles/
│   │   ├── types.ts
│   │   ├── durations.ts
│   │   ├── forecasts.ts
│   │   └── forecasts.test.ts
│   └── dates/
├── hooks/
├── styles/
│   ├── tokens.css
│   └── globals.css
└── main.tsx
```

Règle d'architecture : `domain/` ne doit importer ni React, ni Dexie, ni Tailwind. Les calculs doivent pouvoir être testés avec une simple liste de dates.

## 6. Modèle de données local

```ts
type Period = {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  flow?: "light" | "medium" | "heavy";
  symptoms?: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
};

type AppSettings = {
  forecastMethod: "median-6" | "mean-6" | "weighted";
  firstDayOfWeek: 0 | 1;
};
```

Décisions importantes :

- Les identifiants sont générés localement.
- Les dates de calendrier sont des dates civiles, donc des `YYYY-MM-DD`.
- `createdAt` et `updatedAt` peuvent être des timestamps ISO, car ils décrivent un instant technique.
- L'export doit contenir un format versionné, par exemple `{ version: 1, periods: [], settings: {} }`.
- Une importation doit valider la structure avant toute écriture dans IndexedDB.

## 7. Algorithmes de v0

### Données d'entrée

Les durées de cycle sont calculées entre les premiers jours de deux périodes confirmées successives. Les dates non confirmées ne servent pas à entraîner une prédiction.

### Méthodes disponibles

1. **Dernier cycle** : baseline très réactive, affichée uniquement comme comparaison.
2. **Moyenne des six derniers cycles** : baseline classique.
3. **Médiane des six derniers cycles** : méthode recommandée par défaut.
4. **Moyenne pondérée** : option expérimentale donnant davantage de poids aux cycles récents.
5. **Plage empirique** : bornes calculées à partir de la variabilité historique.

### Règles de présentation

- Moins de trois cycles : pas de prédiction, seulement une invitation à continuer le suivi.
- Trois à cinq cycles : prédiction affichée avec confiance faible.
- Six cycles ou plus : médiane et plage historique affichées.
- Cycle très atypique : ne pas le supprimer silencieusement ; le signaler et montrer son impact possible.
- Ne jamais afficher une date d'ovulation ou une fenêtre fertile à partir des seules dates de règles.

### Validation rétrospective

Lorsque suffisamment de données sont disponibles, l'application pourra comparer les méthodes sur l'historique de l'utilisatrice :

1. masquer un cycle connu ;
2. produire une prédiction avec les cycles précédents ;
3. mesurer l'écart avec la date réelle ;
4. répéter pour chaque cycle possible ;
5. afficher l'erreur médiane et la couverture de la plage.

Cette évaluation personnelle est plus utile qu'une affirmation générale de précision. Elle ne doit toutefois être activée qu'après assez de cycles et rester présentée comme un indicateur descriptif.

## 8. Stratégie d'animation

### Principe

L'animation doit expliquer un changement, confirmer une action ou préserver une relation spatiale. Elle ne doit pas ralentir une saisie répétée.

### Répartition

- **CSS** : focus, press, hover desktop, transitions de couleur et petits états.
- **Motion** : entrée d'une feuille ou d'un dialogue, transition entre vues, apparition de la plage estimée, confirmation d'un enregistrement.
- **Aucune animation** : saisie de date, navigation répétitive, actions clavier, éléments consultés très fréquemment.

### Tokens de mouvement

```css
--duration-fast: 120ms;
--duration-base: 180ms;
--duration-slow: 280ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

Règles :

- privilégier `transform` et `opacity` ;
- ne pas animer `width`, `height`, `margin`, `padding`, `top` ou `left` pour les interactions courantes ;
- sorties légèrement plus rapides que les entrées ;
- les gestes doivent être interrompables ;
- prévoir une alternative sans déplacement pour `prefers-reduced-motion: reduce` ;
- tester les animations sur le vrai iPhone, pas seulement dans un navigateur desktop.

### Bibliothèque choisie

Utiliser le paquet `motion` :

```bash
npm install motion
```

```tsx
import { motion, AnimatePresence } from "motion/react";
```

Ne pas ajouter GSAP ou React Spring en v0. `motion` couvre les transitions React, les gestes et les changements de layout sans multiplier les concepts.

## 9. Skills OpenCode retenus

Le but n'est pas d'installer tous les skills disponibles. On retient un petit ensemble non redondant et on les installe au niveau du projet.

### Design et UX

#### `frontend-design`

Pour définir une direction visuelle cohérente avant d'écrire les composants : typographie, palette, composition, états et prévention des interfaces génériques.

Source : <https://github.com/anthropics/skills>

#### `designing-user-experience`

Pour les parcours de saisie, l'onboarding, les états vides, les erreurs, les confirmations et l'usage mobile.

Source : <https://github.com/osmontero/opencode-skills>

#### `building-accessible-interfaces`

Pour les contrastes, les labels, le focus, le clavier, les lecteurs d'écran et les zones tactiles.

Source : <https://github.com/osmontero/opencode-skills>

#### `reviewing-interface-quality`

À utiliser avant une livraison pour critiquer l'interface et corriger les défauts visuels ou fonctionnels évidents.

Source : <https://github.com/osmontero/opencode-skills>

### Animation et finition

#### `emil-design-eng`

Pour décider quand animer, choisir des durées et courbes sobres, éviter les animations décoratives et préserver la sensation de rapidité.

Source : <https://github.com/emilkowalski/skills>

#### `review-animations`

À invoquer explicitement lors de la revue finale des animations. Il vérifie notamment les performances, le reduced motion, les durées et les propriétés animées.

Source : <https://github.com/emilkowalski/skills>

### Qualité code et tests

#### Playwright + `web-design-guidelines`

Playwright reste la bibliothèque de test navigateur à installer dans le projet pour les scénarios de première ouverture, ajout d'une période, conservation des données et comportement hors ligne. Le skill Vercel `web-design-guidelines` complète ces tests par une revue des règles d'interface, d'accessibilité et de responsive design.

Source du skill : <https://github.com/vercel-labs/agent-skills>

### Spécification et découpage en tickets

Pour éviter de passer directement du plan à une grosse session de code, utiliser une chaîne de spécification courte et explicite.

#### `grill-with-docs` - clarification optionnelle

À utiliser si une décision produit reste ambiguë : public cible, comportement d'une période incomplète, sens exact d'une plage ou frontière de la v0. Le skill aide à produire un vocabulaire de domaine et à faire émerger les décisions bloquantes avant la spécification.

#### `to-spec` - spécification produit/technique

À utiliser lorsque le périmètre de la v0 est suffisamment clair. Il transforme le plan et la conversation en une spécification structurée avec objectifs, user stories, décisions, critères d'acceptation et hors périmètre.

#### `to-tickets` - découpage en tickets verticaux

À utiliser après validation de la spécification. Il découpe le travail en **tracer bullets** : chaque ticket doit produire un comportement démontrable de bout en bout, et doit déclarer ses dépendances (`Blocked by`). Il faut éviter un découpage horizontal du type « tout le stockage », puis « toute l'interface », puis « tous les tests ».

#### `implement` et `code-review` - chaîne aval

Ces skills ne sont pas des skills de spécification, mais ils complètent naturellement le workflow : implémenter un ticket validé, puis revoir le résultat. Ils ne doivent pas être lancés avant que les critères d'acceptation soient suffisamment clairs.

#### `tdd` - garde-fou d'implémentation

À utiliser pour les fonctions de dates, les algorithmes d'estimation, l'import/export et les transitions de données. Les tests doivent vérifier des comportements observables, pas la structure interne des composants.

Sources :

- <https://github.com/mattpocock/skills>
- <https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md>
- <https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md>
- <https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md>

## 10. Installation des skills

À exécuter depuis la racine du projet, après vérification de leur contenu et de leur licence :

```bash
npx skills@latest add https://github.com/anthropics/skills --skill frontend-design
npx skills@latest add https://github.com/osmontero/opencode-skills --skill designing-user-experience
npx skills@latest add https://github.com/osmontero/opencode-skills --skill building-accessible-interfaces
npx skills@latest add https://github.com/osmontero/opencode-skills --skill reviewing-interface-quality
npx skills@latest add https://github.com/emilkowalski/skills --skill emil-design-eng
npx skills@latest add https://github.com/emilkowalski/skills --skill review-animations
npx skills@latest add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
npx skills@latest add https://github.com/mattpocock/skills --skill grill-with-docs
npx skills@latest add https://github.com/mattpocock/skills --skill to-spec
npx skills@latest add https://github.com/mattpocock/skills --skill to-tickets
npx skills@latest add https://github.com/mattpocock/skills --skill tdd
npx skills@latest add https://github.com/mattpocock/skills --skill implement
npx skills@latest add https://github.com/mattpocock/skills --skill code-review
```

Si la CLI installe dans `.agents/skills/`, cela reste compatible avec OpenCode. Le projet pourra aussi utiliser `.opencode/skills/` explicitement. Après installation, redémarrer la session OpenCode.

Les skills tiers sont du code et des instructions externes : ne pas les installer aveuglément, vérifier leur contenu, leurs scripts et leurs licences. Aucun skill ne doit être autorisé à envoyer les données menstruelles vers un service distant.

## 11. Phases de réalisation

### Phase 0 - fondation

- créer le projet Vite React TypeScript ;
- configurer lint, formatage et scripts npm ;
- ajouter les tokens CSS et la direction visuelle ;
- installer la PWA et vérifier le build.

### Phase 1 - domaine et persistance

- définir les types ;
- créer la base Dexie ;
- implémenter l'ajout, la modification et la suppression d'une période ;
- implémenter l'export/import ;
- tester les dates et les fuseaux horaires.

### Phase 2 - expérience minimale

- écran d'accueil ;
- saisie du premier jour ;
- calendrier ;
- estimation médiane + plage ;
- états vide, erreur et absence de données suffisantes.

### Phase 3 - finition

- historique et explication de la méthode ;
- transitions utiles ;
- reduced motion ;
- responsive iPhone ;
- audit accessibilité.

### Phase 4 - validation

- tests unitaires des algorithmes ;
- tests Playwright des parcours critiques ;
- test offline après installation ;
- test sur iPhone réel ;
- déploiement HTTPS statique.

### Phase 5 - spécification et tickets de réalisation

Cette phase intervient avant l'implémentation réelle de la v0 :

1. utiliser `grill-with-docs` uniquement si une décision produit est encore bloquante ;
2. utiliser `to-spec` pour produire une spécification validable à partir de ce plan ;
3. relire et approuver les user stories et critères d'acceptation ;
4. utiliser `to-tickets` pour générer des tickets verticaux et leurs dépendances ;
5. conserver d'abord les tickets en fichiers Markdown locaux, sous `.scratch/periodperiods/issues/`, puisqu'aucun tracker distant n'est nécessaire pour démarrer ;
6. implémenter un ticket à la fois avec `implement`, en utilisant `tdd` sur les modules déterministes ;
7. terminer par `code-review` et une vérification sur iPhone.

Découpage initial envisagé, à confirmer par `to-tickets` :

1. **Shell PWA installable** - démarrage Vite, manifest, service worker, layout mobile et build offline.
2. **Saisie locale d'une période** - formulaire, validation, persistance IndexedDB et retour utilisateur.
3. **Calendrier et première estimation** - historique, médiane, plage et états de confiance.
4. **Historique, export et suppression** - données compréhensibles, export/import versionné et suppression locale.
5. **Finition et validation mobile** - accessibilité, animations, tests navigateur et vérification iPhone.

Les tickets ne doivent être publiés ou implémentés qu'après validation de leur granularité et de leurs dépendances. Le skill `to-tickets` est conçu pour poser ces questions avant publication.

## 12. Critères de sortie de v0

- L'application peut être ajoutée à l'écran d'accueil depuis Safari.
- Une période peut être enregistrée en moins de deux interactions principales.
- Les données restent disponibles après fermeture et réouverture.
- L'application démarre et permet de consulter l'historique hors ligne.
- La prédiction disparaît ou affiche une confiance faible lorsque les données sont insuffisantes.
- Les dates confirmées et les dates estimées sont visuellement distinctes.
- L'utilisateur peut exporter puis réimporter ses données.
- L'utilisateur peut supprimer toutes les données locales.
- Aucun appel réseau ne contient de donnée menstruelle.
- Les tests d'algorithmes couvrent les cycles réguliers, irréguliers, atypiques et les dates insuffisantes.
- `prefers-reduced-motion` est respecté.
- Aucune animation ne bloque la saisie ou la navigation.

## 13. Documentation de référence

- OpenCode V2 - Skills : <https://opencode.ai/v2/docs/skills/>
- Vite PWA : <https://vite-pwa-org.netlify.app/guide>
- Vite PWA React : <https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/frameworks/react.md>
- Motion for React : <https://motion.dev/docs/react>
- Motion installation : <https://motion.dev/docs/react-installation>
- Dexie.js : <https://dexie.org/>
- Vitest : <https://vitest.dev/>
- Playwright : <https://playwright.dev/>
- shadcn/ui : <https://ui.shadcn.com/>

## 14. Décisions repoussées

- synchronisation entre appareils ;
- chiffrement applicatif complet de la base ;
- Face ID ou verrouillage biométrique ;
- notifications de rappel ;
- intégration Apple Health/HealthKit ;
- modèle bayésien ou apprentissage automatique ;
- publication App Store ;
- compte utilisateur et récupération cloud.

Ces sujets ne doivent pas ralentir la validation du modèle local-first.
