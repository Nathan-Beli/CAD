# Blainville RP QC - Bot Discord Banque

Bot Discord en Node.js avec `discord.js`.

## Fonctions incluses

- `/solde` pour voir son solde.
- `/banque-menu` pour envoyer le menu bancaire avec les boutons.
- `/virement` pour envoyer de l'argent avec une mention `@membre`.
- `/facture-ajouter` pour ajouter une facture a un membre avec le type `amende` ou `entreprise`.
- `/facture-payer` pour payer une facture.
- `/staff ajouter-argent` pour ajouter de l'argent a un joueur.
- `/staff retirer-facture` pour retirer une facture a un joueur.
- Bouton `Banque` pour voir son compte.
- Bouton `Prendre mon salaire` avec cooldown de 24 heures.
- Bouton `Virement` pour envoyer de l'argent a un autre membre avec une mention.
- Bouton `Facture` pour voir et payer ses factures.
- Stockage local dans `src/data/bank.json`.

## Types de factures

- `amende`: l'argent est retire du joueur et ne va a personne.
- `entreprise`: l'argent est retire du joueur et envoye a la personne qui a cree la facture.

## Staff et logs

- Role staff autorise: `1484018086129696868`.
- Salon logs: `1498847787540942988`.
- Seules les sous-commandes `/staff ajouter-argent` et `/staff retirer-facture` envoient des logs.

## Installation

```bash
npm.cmd install
```

Copie `.env.example` vers `.env`, puis remplis:

```env
DISCORD_TOKEN=ton_token
CLIENT_ID=id_de_ton_application
GUILD_ID=id_de_ton_serveur
```

Ne partage jamais le token du bot.

## GitHub et securite

Le vrai fichier `.env` est ignore par `.gitignore`. Pour GitHub, pousse seulement:

```txt
.env.example
```

Si tu heberges le bot, ajoute les secrets directement dans les variables d'environnement de l'hebergeur:

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`

Si un token a deja ete public sur GitHub, il faut le regenerer dans le Discord Developer Portal.

## Lancer le bot seul

Deploie les commandes slash sur ton serveur:

```bash
npm.cmd run deploy
```

Puis demarre le bot:

```bash
npm.cmd start
```

Quand le bot est lance, il demarre aussi une API locale pour le dashboard:

```txt
http://127.0.0.1:4174/api/dashboard/me?userId=ID_DISCORD
```

Le dashboard doit etre ouvert en local pour la connexion Discord:

```txt
http://127.0.0.1:4173/index.html
```

Dans le portail Discord Developer, ajoute cette Redirect URI OAuth2:

```txt
http://127.0.0.1:4173/index.html
```

Le dashboard synchronise automatiquement:

- le nom Discord;
- les roles Discord;
- le role dashboard `staff` si le membre a le role `1484018086129696868`;
- le solde bancaire;
- les factures du bot.

## Lancer dashboard + bot ensemble

Tu peux maintenant lancer le site depuis:

```txt
..\blainville-rp-dashboard-visuel\start-dashboard.bat
```

Le dashboard lit son propre `.env`, lance le bot avec ces infos, puis sert le site sur:

```txt
http://127.0.0.1:4173/index.html
```

Active dans le portail Discord:

- Server Members Intent
- Message Content Intent

Le Message Content Intent est necessaire pour afficher les arrestations venant des salons:

- `1482756676745564284`
- `1482754417173332188`

## Permissions Discord

Invite le bot avec les scopes:

- `bot`
- `applications.commands`

Permissions utiles:

- View Channels
- Send Messages
- Use Slash Commands
