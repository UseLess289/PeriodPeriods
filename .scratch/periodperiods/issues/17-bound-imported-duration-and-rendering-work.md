# 17: Borner les données importées et le travail de rendu

**Ce que l’utilisatrice peut faire :** importer un fichier valide sans bloquer
l’application ni déclencher une allocation disproportionnée.

**Priorité :** P1 — à résoudre avant d’accepter des fichiers externes en v1. Les
durées actuellement validées peuvent être arbitrairement grandes; Statistiques
alloue ensuite des cellules selon cette durée.

**Statut :** spécification validée — limite de fichier 10 MiB; durée sans plafond fixe.

**Fichiers concernés :** `src/domain/periods/index.ts`, `src/data/period-backup.ts`,
`src/data/period-csv.ts`, `src/data/flo-import.ts`,
`src/features/settings/BackupSettingsView.tsx`, `src/features/stats/StatsView.tsx`.

**Critères d’acceptation :**

- Le format de données n’impose pas de plafond arbitraire à la durée d’une
  période; les valeurs restent validées comme entiers positifs sûrs.
- Le rendu des statistiques est borné et ne crée pas de matrice ni de boucle
  proportionnelle sans borne à la durée; les longues durées restent consultables
  sans être tronquées dans le stockage ni les sauvegardes.
- La taille maximale des fichiers est vérifiée avant lecture du contenu; un
  fichier trop gros est refusé avant toute écriture et conserve les données.
- L’interface ne crée pas de matrice ni de boucle dont le coût dépend sans borne
  d’une valeur importée; un historique volumineux reste navigable.
- Aucune nouvelle limite de durée ne transforme silencieusement les données
  existantes.

**Décisions validées :** conserver les longues durées sans plafond fixe; limiter
chaque fichier d’import à 10 MiB. La limite est contrôlée via `File.size` avant
`file.text()`.

**Tests :** juste sous/à/au-dessus des limites; durée `Number.MAX_SAFE_INTEGER`,
fichier énorme déclaré avant lecture, JSON/CSV/Flo malformés; vérifier absence de
mutation, blocage UI ou allocation géante.
