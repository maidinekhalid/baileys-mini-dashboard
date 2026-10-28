# WAPPS v2 — Déploiement reproductible dans Coolify 4.5.0

## Prérequis

- Nouveau dépôt GitHub privé avec **compose.yaml à la racine** et le dossier `dashboard/`.
- Une **nouvelle ressource GitHub Docker Compose**, branche `main`, Build strategy **Compose**, Base directory `/`, Docker compose location `/compose.yaml`.
- Dans Advanced > Docker compose : **Compose deployment = Managed by Coolify** et **Predefined network = Connect to predefined network**. Ne pas employer « Isolated network only » si le proxy n'applique pas les routes dans votre configuration.
- Variables Runtime : `REDIS_PASSWORD`, `BAILEYS_API_KEY`, `DASHBOARD_PASSWORD` (>=12), `WEBHOOK_SECRET` (20+ uniquement lettres/chiffres), `PUBLIC_URL`.
- Assigner **un seul domaine HTTP(S)** au service `dashboard` sur le port interne **3080**. Éviter d'exposer publiquement `baileys-api` et Redis.
- `PUBLIC_URL` = adresse **exacte** du dashboard (schéma HTTP ou HTTPS compris), pas de `/` final ni `:3080`. À modifier si le domaine change.

## Avant de déployer

```bash
node scripts/preflight.mjs
```

Ce précontrôle examine uniquement les fichiers. Il ne vérifie pas le serveur Coolify.

## Après déploiement

1. Dans Coolify, contrôler `redis` et `baileys-api` Healthy, `dashboard` Running.
2. Ouvrir le domaine du service `dashboard` ; s'authentifier avec `DASHBOARD_PASSWORD`.
3. Utiliser **03 · Diagnostic d'installation** pour vérifier Baileys et la concordance du domaine.
4. Puis connecter un numéro de test et scanner le QR.

## Erreurs typiques

- **404 page not found** : tester `/health` sur le port `3080` à l'intérieur du conteneur. Si 200 : inspecter l'existence effective des labels `traefik.*` du conteneur dashboard. Un `Show Deployable Compose` correct ne suffit pas à prouver qu'ils ont été appliqués. Vérifier mode `Managed by Coolify`, réseau prédéfini et redéployer après sauvegarde.
- **403 Origine refusée** : URL du navigateur différente de `PUBLIC_URL` ; corriger puis redéployer.
- **401 sur webhook** : URL /hook avec secret incorrect ou requête dirigée vers une autre route qui demande Basic Auth ; vérifier le secret alphanumérique, éviter de partager les valeurs.
- **QR absent** : vérifier via diagnostic API ; si une session existe avec un ancien webhook, vérifier avant toute suppression. La déconnexion d'une session déjà appairée est disruptive.
- **Restarting** : consulter Runtime Logs ; une variable manquante ou invalide peut faire arrêter le dashboard.

## Important

Ne pas copier de vrais secrets dans GitHub. Ne pas écraser des volumes existants. Pour la production, HTTPS est indispensable (Basic Auth et QR sensibles). `baileys-api:latest` évolue : figer une version après qualification. Baileys n'est pas l'API officielle Meta.
