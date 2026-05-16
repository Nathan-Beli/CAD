# CAD - Portail d'acces Blainville RP QC

Cette version repart a zero et sert seulement de portail d'acces par roles Discord.

## Lancement

```bash
npm start
```

Ou double-clique:

```txt
cad/start-cad.bat
```

Ouvre ensuite:

```txt
http://localhost:4175/index.html
```

Le serveur lit le `.env` du dossier `cad` si present, sinon celui de `blainville-rp-dashboard-visuel`.

## Hebergement

La commande de demarrage doit etre:

```bash
npm start
```

Le serveur utilise automatiquement `PORT` quand l'hebergeur le fournit. Le bot Discord est lance par le serveur CAD et son API interne utilise `DASHBOARD_API_PORT`, par defaut `4174`, pour ne pas entrer en conflit avec le port public du site.

Variables a mettre sur l'hebergeur:

```env
DISCORD_TOKEN=token_du_bot
CLIENT_ID=id_application_discord
GUILD_ID=id_du_serveur_discord
DASHBOARD_API_PORT=4174
CAD_START_BOT=true
NODE_ENV=production
```

Dans le Discord Developer Portal, ajoute l'URL hebergee exacte comme Redirect URI OAuth2, par exemple:

```txt
https://ton-site.up.railway.app/index.html
```

## Roles CAD

- Surete du Quebec: `1484018631653330954`
- SPVB: `1484161421448056943`
- SIVB: `1484368916812660746`
- SPALL: `1484347605713424495`
- MTQ: `1484743685248913538`

Le bot Discord renvoie les acces dans `profile.cadServices` via `/api/dashboard/me?userId=...`.
