# Installation du dépôt complet sur Coolify

Ce dépôt contient Redis, Baileys API, et le dashboard WhatsApp avec réception automatique des QR codes. **Une seule ressource Docker Compose**.

## Préparation
1. Créer un **nouveau dépôt GitHub privé**, par exemple `baileys-complete`.
2. Envoyer **le contenu de ce dossier à la racine** du dépôt, pas le dossier lui-même.
3. Dans Coolify : Projects > New Resource > Private Repository > choisir ce dépôt.
4. Type **Docker Compose**, fichier `/compose.yaml`.
5. Ajouter les cinq variables d'environnement **Runtime** :
   - `REDIS_PASSWORD` : mot de passe alphanumérique fort (sans `@`, `:`, `/`, `#`, `%`).
   - `BAILEYS_API_KEY` : clé alphanumérique forte, différente du mot de passe Redis.
   - `DASHBOARD_PASSWORD` : mot de passe de l'interface, 12 caractères minimum.
   - `WEBHOOK_SECRET` : secret alphanumérique, 20 caractères minimum, sans symboles URL.
   - `PUBLIC_URL` : adresse HTTP(S) exacte du nouveau dashboard, sans slash final.
6. Dans les domaines Coolify, affecter un domaine au **service `dashboard` uniquement**, avec port interne **3080**.
7. Enregistrer `PUBLIC_URL` et cliquer sur Deploy.
8. Ouvrir le domaine dashboard, s'authentifier avec `DASHBOARD_PASSWORD`, tester la clé API, renseigner un numéro de test et cliquer sur Connecter. Le QR apparaît dans la page.

## Important
- Nouvelle stack = **nouveaux volumes et nouvelles sessions** : ne pas supprimer l'installation actuelle.
- Aucun port Redis ou Baileys n'est publié. Ils communiquent dans le réseau Compose interne.
- Le webhook est `http://dashboard:3080/hook/<secret>` ; il n'a pas besoin de domaine public.
- Ne pas publier de fichiers `.env` contenant des secrets.
- Le dashboard actuel inclut un parcours de connexion par QR, pas encore un assistant graphique de provisioning Coolify depuis l'intérieur du dashboard : le provisioning se fait par un seul Compose.
- HTTP avec Basic Auth n'est acceptable que pour un laboratoire isolé. Pour un accès extérieur réel, utiliser HTTPS.
- Baileys est non officiel ; aucun mécanisme ne garantit l'absence de bannissement WhatsApp.
