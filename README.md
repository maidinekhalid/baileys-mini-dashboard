# WhatsApp API Manager (Baileys)

Mini-dashboard Node.js sans dépendance NPM : connexion WhatsApp, QR par webhook, état de session, test d'authentification, message texte. Conçu pour fazer-ai/baileys-api v3.7.3 et Coolify.

## Déployer dans Coolify

1. Décompresser l'archive et **publier les fichiers dans un dépôt GitHub privé**, sans créer de fichier `.env` contenant des secrets.
2. Coolify > WhatsApp-API > production > New Resource > Private Repository (ou Public Repository si seuls les sources, sans secrets, sont publiés).
3. Build pack **Dockerfile**; Dockerfile location `/Dockerfile` et port interne **3080**.
4. Configurer les variables ci-dessous dans Coolify, avant Deploy :

| Variable | Valeur |
|---|---|
| `PORT` | `3080` |
| `BAILEYS_BASE_URL` | URL accessible depuis le conteneur dashboard, par exemple `http://qync9shdif8nstqgxksypeg6.178.16.130.71.sslip.io` (ne pas inclure `/swagger`) |
| `BAILEYS_API_KEY` | Valeur actuelle `SERVICE_PASSWORD_64_DEFAULTAPIKEY` de Baileys. Ne pas publier. |
| `DASHBOARD_PASSWORD` | Nouveau mot de passe robuste (12 caractères minimum) |
| `WEBHOOK_SECRET` | Secret aléatoire distinct (20 caractères minimum, idéalement 40+) |
| `PUBLIC_URL` | **URL exacte** publique du nouveau dashboard, `http://dashboard-....sslip.io`, sans `/` final |

5. Configurer le domaine public du dashboard (port interne **3080**) dans Coolify puis renseigner `PUBLIC_URL` avec ce domaine **avant le déploiement**. Ne pas exposer directement les ports 3025, 3026 ou 3080 via le pare-feu ; les accès passent par Coolify.
6. Ouvrir l'URL du dashboard dans le navigateur. Une boîte de dialogue de connexion apparaît : utilisateur libre, mot de passe = `DASHBOARD_PASSWORD`.
7. Cliquer sur **Tester la clé API**, puis renseigner le numéro à connecter et **Connecter / actualiser**. Le QR apparaît automatiquement lorsque Baileys l'envoie au webhook configuré.
8. WhatsApp mobile > Appareils connectés > Connecter un appareil > Scanner le QR. Ensuite, envoyer un message vers un numéro de test consentant.

## Session déjà créée avec un ancien webhook

Important : Baileys peut conserver le webhook `http://localhost:3026/whatsapp/test` de la session existante ; cliquer de nouveau sur POST /connections peut ne mettre à jour que sa présence. Si le dashboard n'affiche pas de QR malgré un backend fonctionnel, **ne répétez pas aveuglément POST**. Pour repartir proprement sur le numéro **de test**, dans Swagger exécuter `DELETE /connections/{phoneNumber}` (cette opération déconnecte l'appareil et efface l'authentification existante). Ensuite, dans le dashboard, cliquer sur **Connecter / actualiser**. N'effectuez pas DELETE sur un numéro réel déjà connecté sans accepter la déconnexion.

## Comment fonctionne le webhook

Baileys envoie `connection.update` vers `PUBLIC_URL/hook/WEBHOOK_SECRET`. Le dashboard exige également `webhookVerifyToken=WEBHOOK_SECRET` dans le corps. L'image QR est gardée **en mémoire uniquement**, pas écrite sur disque, et fournie à l'interface protégée. Le dashboard ne stocke pas de messages ni de contacts.

## Notes de sécurité

- HTTP expose identifiants et données aux observateurs réseau. **Passer en HTTPS avant tout usage réel**, même si HTTP est acceptable sur un laboratoire isolé.
- La clé API précédemment copiée dans des logs/conversations devrait être renouvelée avant exposition permanente.
- Pour du test, utiliser un numéro WhatsApp dédié.
- Éviter d'utiliser une URL webhook fictive ou d'afficher les QR dans les logs.
- Le mini-dashboard n'est pas une boîte de réception et ne remplace pas Chatwoot.
- Les restrictions CORS du navigateur ne s'appliquent pas : le serveur dashboard appelle Baileys côté serveur.

## Vérifications

`GET /health` donne `{"ok":true}`. La route du webhook n'est pas protégée par Basic Auth, mais elle nécessite le bon chemin secret et le champ `webhookVerifyToken`. Les autres routes sont protégées par mot de passe Basic Auth.

## Lancer localement

`npm start` avec les variables définies dans un environnement sécurisé. Node 20+ requis. Aucun package externe.
