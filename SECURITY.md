# Sécurité de R-Case

Ce document résume l'audit de sécurité que j'ai mené sur le site en production (novembre 2026), avec la méthode utilisée et les correctifs appliqués.

## Méthode

J'ai testé le site **comme un attaquant extérieur**, avec uniquement ce qu'un visiteur peut voir : le code JavaScript public et la clé publique Supabase.

Les tests ont porté sur :
- l'accès direct à l'API REST de la base, sans passer par le site ;
- la lecture et l'écriture de chaque table ;
- la création de compte ;
- la manipulation des prix et des quantités dans une commande ;
- le spam de commandes ;
- l'envoi de fichiers ;
- les en-têtes HTTP ;
- l'intégration du site dans un cadre (clickjacking) ;
- l'indexation de l'espace propriétaire ;
- les fichiers sensibles exposés.

## Résultats et correctifs

| # | Constat | Risque | Correctif |
|---|---|---|---|
| 1 | L'URL de redirection de l'authentification pointait vers une ancienne adresse Netlify, libre d'être réutilisée | Vol d'un lien de réinitialisation du mot de passe | URL du site et URL de redirection verrouillées sur le domaine actuel |
| 2 | Les inscriptions étaient ouvertes | Création de comptes inconnus | Inscriptions désactivées : un seul compte gérante |
| 3 | `is_admin()` se fiait à l'email présent dans le jeton | Usurpation en cas de jeton mal formé | Vérification d'un compte **confirmé** dans `auth.users` |
| 4 | Commandes illimitées | Spam, pollution des données | Limite de 25 commandes du site par tranche de 10 minutes, format de référence et nombre d'articles validés |
| 5 | Les articles retirés du site restaient lisibles par l'API | Fuite d'informations | Politique RLS : le public ne lit que les articles publiés |
| 6 | Aucun en-tête de sécurité HTTP | XSS, clickjacking, MIME sniffing | CSP stricte, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP |
| 7 | Script tiers (CDN) sans contrôle d'intégrité | Attaque de la chaîne d'approvisionnement | Subresource Integrity (`integrity` + `crossorigin`) |
| 8 | Stockage des photos sans limite | Dépôt de fichiers malveillants ou volumineux | Images uniquement (JPEG, PNG, WebP), 3 Mo maximum |
| 9 | Espace propriétaire indexable | Exposition de la page de connexion | `noindex` (balise et en-tête), `robots.txt`, `Cache-Control: no-store` |
| 10 | Mot de passe faible | Accès frauduleux | Mot de passe fort et unique |

## Ce qui était déjà solide

- **Row Level Security** est activée sur toutes les tables. Le public ne peut lire ni les commandes, ni les prix d'achat, ni les dépenses, ni la liste des gérants. Il ne peut pas non plus modifier un prix ou insérer une commande directement.
- **Les prix sont recalculés côté serveur** dans `place_order` : un client ne peut pas imposer son prix, même en modifiant la requête.
- Les fichiers SQL et de configuration ne sont pas servis par le site (erreur 404).

## Note sur la clé Supabase « anon »

La clé `anon` est **publique par conception** : elle est visible dans tout site Supabase. La sécurité ne repose pas sur son secret, mais sur les règles RLS et les fonctions côté serveur. Dans ce dépôt, `config.js` est laissé vide par bonne pratique. Aucune clé `service_role` n'est jamais utilisée côté client.

## Signaler un problème

Si tu trouves une faille, contacte-moi en privé plutôt que d'ouvrir une issue publique.
