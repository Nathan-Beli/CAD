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

Optionnel pour brancher ERLC:

```env
ERLC_STATE_URL=https://ton-api-erlc.example/state
ERLC_API_KEY=cle_api_erlc
```

Le salon/forum des dossiers medicaux SPALL utilise:

```txt
1483574322399416320
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

## Fonctionnement actuel

- La carte civile sauvegarde prenom et nom dans le navigateur.
- Les boutons SQ, SPVB, SIVB, SPALL et MTQ se deverrouillent selon les roles Discord.
- Repartisseur 911 est visible en coming soon.
- Apres le choix du service, le CAD demande matricule, grade et subdivision.
- GTI est disponible seulement pour SQ.
- Les panneaux ERLC sont prets a recevoir les appels, unites, mandats et positions via `ERLC_STATE_URL`.
- Les dossiers medicaux SPALL sont importes par le bot depuis le salon/forum Discord quand le bot est en ligne.
- Le suivi SHIFT est reserve aux equipes police SQ/SPVB; le bouton SHIFT est visible pour les roles directeur/direction/staff.
