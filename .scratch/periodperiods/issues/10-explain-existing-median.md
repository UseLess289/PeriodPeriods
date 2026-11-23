# 10 : Comprendre l’estimation médiane existante

**Ce que l’utilisatrice peut faire :** ouvrir une explication courte des données
et règles déjà utilisées par l’estimation de phase 2.

**Statut :** terminé

**Critères d’acceptation :**

- Une divulgation native sur l’accueil est disponible avec ou sans estimation.
- Le texte explique les intervalles, les trois seuils d’historique, la médiane,
  l’arrondi déjà spécifié, les six intervalles servant à la plage et l’exclusion
  des dates futures. Il précise qu’un intervalle n’est pas la durée des règles,
  que la médiane arrondie est ajoutée au dernier début passé, et que les bornes
  de plage projettent le minimum et le maximum des six durées retenues.
- Le texte précise que l’estimation et sa plage décrivent l’historique sans
  garantie et conserve le disclaimer existant.
- Aucun calcul, seuil, méthode ou réglage n’est ajouté ou modifié.
- L’ouverture/fermeture fonctionne au clavier et son état est annoncé nativement.

**Bloqué par :** 07 — Afficher l’estimation médiane.

**Tests :** tests d’interface accessibles couvrant les trois états (insuffisant,
faible, plage) et le maintien du résultat médian existant.
