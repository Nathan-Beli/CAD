# CAD - Portail d'acces Blainville RP QC

Cette version repart a zero et sert seulement de portail d'acces par roles Discord.

## Lancement

```bash
node cad/server.mjs
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

## Roles CAD

- Surete du Quebec: `1484018631653330954`
- SPVB: `1484161421448056943`
- SIVB: `1484368916812660746`
- SPALL: `1484347605713424495`
- MTQ: `1484743685248913538`

Le bot Discord renvoie les acces dans `profile.cadServices` via `/api/dashboard/me?userId=...`.
