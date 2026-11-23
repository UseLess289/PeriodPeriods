# 05: Saisir un début et le retrouver sur l’accueil

**Ce que l’utilisatrice peut faire :** enregistrer localement le premier jour de
ses règles et retrouver le dernier début enregistré sur l’accueil.

**Bloqué par :** aucun — les APIs de persistance de phase 1 sont disponibles.

**Statut :** terminé

- [x] L’accueil propose une date civile locale préremplie avec aujourd’hui et
  permet d’enregistrer aujourd’hui ou une date passée.
- [x] Une date future et un début déjà présent sont refusés avec un message
  exploitable; aucune donnée n’est ajoutée.
- [x] En cas d’erreur, la valeur saisie est conservée et l’utilisatrice peut
  réessayer; réussite et chargement ont un retour accessible.
- [x] Le dernier début apparaît sur l’accueil et les données persistent après
  rechargement via l’API publique du dépôt.
- [x] L’état sans période explique quoi faire et propose une action active.
- [x] Le parcours est utilisable au clavier et sur écran étroit; les champs ont
  des libellés explicites et les erreurs sont associées au champ.
- [x] Les tests observent le formulaire, les retours et la persistance sans
  inspecter directement les tables Dexie.
