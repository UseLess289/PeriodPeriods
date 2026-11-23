# PeriodPeriods — spécification de la phase 1

## Objectif

Définir le modèle des périodes et des réglages, les valider et les conserver dans
IndexedDB. Fournir un export JSON versionné et un import transactionnel. Cette
phase expose une API TypeScript testable; elle ne construit pas encore les écrans
de saisie, de calendrier ou de réglages.

## Décisions validées

- Une date de calendrier est une date civile au format strict `YYYY-MM-DD`; elle
  n'est jamais stockée ni transportée comme un timestamp UTC.
- Une période correspond à un début de règles confirmé. `endDate` est facultative;
  si elle est renseignée, elle ne peut précéder `startDate`.
- Deux périodes ne peuvent pas avoir le même `startDate`. Les dates futures et les
  périodes atypiques ou dont les intervalles se chevauchent ne sont pas rejetés
  par une règle clinique inventée dans cette phase.
- La durée entre deux débuts est le nombre de jours civils, indépendant du
  fuseau horaire et des changements d'heure.
- Les réglages initiaux sont `forecastMethod: "median-6"` et
  `firstDayOfWeek: 1` (lundi).
- Un import v1 remplace toutes les périodes et tous les réglages locaux. Le
  payload complet est validé avant écriture et son application est atomique.
- L'import/export et le CRUD sont des fonctions locales; aucune donnée n'est
  envoyée à un service distant.

## Modèle

```ts
type Period = {
  id: string;
  startDate: string; // date civile YYYY-MM-DD
  endDate?: string; // date civile YYYY-MM-DD
  flow?: "light" | "medium" | "heavy";
  symptoms?: string[];
  note?: string;
  createdAt: string; // canonical ISO 8601 UTC from Date.toISOString()
  updatedAt: string; // canonical ISO 8601 UTC from Date.toISOString()
};

type AppSettings = {
  forecastMethod: "median-6" | "mean-6" | "weighted";
  firstDayOfWeek: 0 | 1;
};
```

Les identifiants et timestamps sont générés localement. Une modification
préserve `id` et `createdAt`, et actualise `updatedAt`. Les périodes retournées
par le dépôt sont triées par `startDate` croissante.

## Comportements et critères d'acceptation

### Dates et modèle

- Les dates impossibles, les formats non canoniques et les débuts dupliqués sont
  refusés avec une erreur exploitable par l'appelant.
- Une période dont la fin précède le début est refusée.
- Le calcul de jours civils donne le même résultat de part et d'autre d'un
  changement d'heure et autour d'une année bissextile.
- Les valeurs de flux sont limitées à `light`, `medium` et `heavy`; les symptômes
  et notes sont conservés sans transformation.

### Persistance

- L'API publique permet d'ajouter, lire, modifier et supprimer une période.
- Un début déjà présent est refusé, y compris lors d'une modification qui
  entrerait en conflit avec une autre période.
- Une modification conserve l'identité et la date de création; une suppression
  d'un identifiant absent retourne `false`.
- Les périodes restent disponibles après fermeture puis réouverture d'IndexedDB.
- Les réglages sont lus et enregistrés; en l'absence de valeur enregistrée, les
  valeurs par défaut ci-dessus sont retournées.

### Sauvegarde v1

Format JSON:

```json
{
  "version": 1,
  "periods": [],
  "settings": {
    "forecastMethod": "median-6",
    "firstDayOfWeek": 1
  }
}
```

- L'export contient toutes les périodes et les réglages de la même transaction.
- Un import valide remplace les données locales et un export/import restitue les
  mêmes périodes et réglages.
- Les timestamps d'import doivent correspondre exactement au format produit par
  `Date.toISOString()` (`.sssZ`). Les variantes ISO 8601 équivalentes ne sont pas
  acceptées en v1; les sauvegardes produites par PeriodPeriods restent
  importables sans conversion.
- JSON mal formé, version inconnue, champ requis absent, date invalide,
  identifiant vide ou dupliqué, début dupliqué, champ inconnu ou réglage invalide :
  l'import échoue sans modifier les données existantes.
- Une erreur d'écriture pendant l'import annule l'ensemble de la transaction.
- Un export vide est valide; aucun format autre que la version 1 n'est accepté.

## Seams de test approuvés

1. Fonctions publiques de validation et de calcul de dates civiles : invariants,
   exemples connus, jours bissextiles et DST.
2. API publique du dépôt : CRUD, réglages et persistance après réouverture.
3. API publique d'export/import : forme JSON, aller-retour, remplacement et
   absence de mutation en cas d'échec.

Les tests de persistance utilisent IndexedDB simulée, sans vérifier directement
les tables Dexie. Les données métier restent validées via les API publiques.
Les tests Playwright et la vérification de la persistance IndexedDB dans Safari
sont reportés à la phase 2, quand l'interface utilisera ces APIs.

## Hors périmètre

- Écrans ou formulaires React de saisie, historique, calendrier et réglages.
- Prévisions, calcul de cycles à partir de l'historique, ovulation et fertilité.
- Notifications, synchronisation, compte, backend ou analytics.
- Migration de données depuis une version antérieure de l'application.
