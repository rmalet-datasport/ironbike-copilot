# DEPLOYMENT.md — Déploiement Vercel (Iron Bike Co-Pilot)

## Vue d'ensemble

- **Repo GitHub** : `https://github.com/rmalet-datasport/ironbike-copilot` (compte
  `rmalet-datasport`), branche `main`.
- **Projet Vercel** : `datasport/ironbike-copilot` (team `datasport`), lié au repo GitHub
  ci-dessus — chaque push sur `main` déclenche un déploiement.
- **État actuel** : preview fonctionnel de bout en bout (auth, comptage, export, génération IA
  réelle). Pas encore promu en production (`vercel deploy --prod`).
- L'ancien plan self-hosted (`lab.datasport.com`) est abandonné : `.github/workflows/deploy.yml`
  et `docker-compose.prod.yml` ont été supprimés le 11.8.2026 (le workflow échouait sur chaque
  push, `GHCR_TOKEN` jamais configuré et plus personne ne s'en servait) — voir `STATUS.md`. Le
  `Dockerfile` reste au cas où.

---

## Le problème que Vercel Blob résout

`data/participants.csv`, `data/Angemeldete Teilnehmende Iron Bike.xlsx` et
`data/mtb_myds_users_export_2026_08_07_1616.xlsx` sont **gitignorés** (vraies données
personnelles, jamais commitées — voir `CLAUDE.md` §Données). En local, chaque collègue garde sa
copie dans `data/`. Sur Vercel, ces fichiers n'existent pas dans le déploiement puisqu'ils ne
sont pas dans le repo.

`readLocalOrBlob()` (`lib/db/data-source.ts`, partagé par `participants.ts` et `prospects.ts`)
gère les deux cas :
1. **Local** : si le fichier existe dans `data/`, il est lu directement (comportement inchangé).
2. **Prod (Vercel)** : si le fichier local est absent, le code lit le même contenu depuis un
   store **Vercel Blob privé** (`ironbike-participants`), via `BLOB_READ_WRITE_TOKEN`.

Les trois fichiers ont été uploadés une fois manuellement (voir commandes ci-dessous). **Il n'y
a pas de synchro automatique** entre `data/` en local et le store Blob — si les données locales
changent, il faut re-uploader.

---

## Variables d'environnement sur Vercel

En plus des 3 variables déjà nécessaires en local (voir `.env.example`, `docs/TESTING.md`) :

| Variable | Environnements | Origine |
|---|---|---|
| `ANTHROPIC_API_KEY` | Production, Preview, Development | ajoutée manuellement (`vercel env add`) |
| `DEMO_PASSWORD` | Production, Preview, Development | ajoutée manuellement |
| `DEMO_COOKIE_SECRET` | Production, Preview, Development | ajoutée manuellement |
| `BLOB_READ_WRITE_TOKEN` | Production, Preview, Development | **auto-provisionnée** par Vercel quand le store Blob est lié au projet |

⚠️ **Piège vécu** : si tu extrais une valeur depuis `.env.local` (format `KEY="valeur"`) pour la
repousser sur Vercel, il faut retirer les guillemets toi-même — `vercel env add` ne le fait pas.
Utilise `--value` (pas un pipe stdin, qui a son propre risque d'encodage) et vérifie avec
`vercel env ls` qu'il n'y a **pas d'entrées dupliquées** pour un même environnement (ça arrive
si tu ajoutes la même variable plusieurs fois avec des combinaisons d'environnements qui se
chevauchent — Vercel semble alors résoudre de façon imprévisible laquelle des deux entrées
utiliser). En cas de doute : `vercel env rm NAME <environment> --yes` pour tout nettoyer, puis
ré-ajouter une fois par environnement.

```powershell
# Ajouter une variable proprement (une fois par environnement)
npx vercel env add ANTHROPIC_API_KEY production --value "sk-ant-..." --sensitive --yes
npx vercel env add ANTHROPIC_API_KEY preview --value "sk-ant-..." --sensitive --yes
npx vercel env add ANTHROPIC_API_KEY development --value "sk-ant-..." --yes  # pas de --sensitive en dev

# Vérifier qu'il n'y a pas de doublons
npx vercel env ls
```

---

## Mettre à jour les données Blob

Quand `data/participants.csv`, la liste des inscrits 2026 ou l'export prospects MTB change et
que le déploiement doit refléter la nouvelle version :

```powershell
$token = (Get-Content .env.local | Where-Object { $_ -match '^BLOB_READ_WRITE_TOKEN=' }) -replace '^BLOB_READ_WRITE_TOKEN=', ''

# Supprimer l'ancienne version puis re-uploader (pas d'écrasement direct en place)
npx vercel blob del participants.csv --rw-token $token
npx vercel blob put data/participants.csv --pathname participants.csv --access private --rw-token $token

# Idem pour la liste des inscrits 2026
npx vercel blob put "data/Angemeldete Teilnehmende Iron Bike.xlsx" --pathname registered-2026.xlsx --access private --rw-token $token --allow-overwrite true

# Idem pour l'export prospects MTB (nom de fichier local exact attendu par lib/db/prospects.ts)
npx vercel blob put "data/mtb_myds_users_export_2026_08_07_1616.xlsx" --pathname mtb-prospects.xlsx --access private --rw-token $token --allow-overwrite true
```

Pas besoin de redéployer après un upload Blob — le code lit le store à chaque requête (pas de
cache de build). `lib/db/participants.ts` garde un cache mémoire par process serverless, donc un
redémarrage (nouveau déploiement, ou cold start Vercel) suffit à voir la nouvelle donnée.

---

## Redéployer

```powershell
npx vercel deploy          # preview — nouvelle URL à chaque fois
npx vercel deploy --prod   # environnement Production — mais PAS une URL stable, voir ci-dessous
```

Un push sur `main` sur GitHub déclenche aussi un déploiement automatiquement (intégration
GitHub liée au projet Vercel) — vérifié le 11.8.2026 : ce déploiement se fait bien dans
l'environnement **Production** (`npx vercel ls` le confirme), pas juste preview.

### ⚠️ Pas de domaine stable — chaque déploiement a sa propre URL à usage unique

Piège vécu le 11.8.2026 : un collègue a testé sur une ancienne URL de déploiement (vieille de
5 jours) et n'y a pas vu les derniers changements, alors que le déploiement le plus récent les
avait bien. `npx vercel domains ls` confirme **0 domaine configuré** sur le projet — chaque
déploiement (preview ou Production) obtient une URL avec un hash aléatoire
(`ironbike-copilot-<hash>-datasport.vercel.app`), et rien ne pointe automatiquement vers "le
dernier déploiement".

**Solution actuelle (bricolage manuel, pas automatique)** : un alias a été créé une fois vers le
déploiement du 11.8.2026 :

```powershell
npx vercel alias set <nouveau-déploiement>.vercel.app ironbike-copilot-datasport.vercel.app
```

⚠️ Cet alias **ne se met pas à jour tout seul** au prochain déploiement — il faut relancer cette
commande (avec la nouvelle URL trouvée via `npx vercel ls`) à chaque fois qu'on veut que
`ironbike-copilot-datasport.vercel.app` reflète le dernier code. Sans ça, ce lien reste figé sur
l'ancien déploiement, exactement comme le piège vécu ci-dessus.

**Vraie solution, pas encore faite** : configurer un domaine persistant (dashboard Vercel →
Project Settings → Domains) qui suive automatiquement chaque déploiement Production, sans
manipulation manuelle après coup. Reste à décider/faire — voir `STATUS.md`.

**Après tout changement de variable d'environnement** : il faut redéployer pour que la nouvelle
valeur soit prise en compte — les fonctions serverless d'un déploiement existant gardent les
valeurs figées au moment du build.

---

## Protection de déploiement Vercel

Les URLs preview (et éventuellement prod selon la config d'équipe) sont protégées par
l'authentification Vercel — différente du mot de passe de l'app (`DEMO_PASSWORD`). Pour ouvrir
un lien preview dans un navigateur : se connecter sur vercel.com avec un compte membre de la
team `datasport`, puis rouvrir le lien.

Pour tester par script/CLI sans navigateur (contourne la protection automatiquement) :

```powershell
npx vercel curl "https://<deployment-url>/api/participants/count" -X POST -H "Content-Type: application/json" -H "Cookie: demo_access=<valeur>" --data "@body.json"
```

`vercel curl` génère et utilise un jeton de contournement automatiquement — plus fiable que de
reconstruire les headers à la main.

---

## Notes de debug (piqûres de rappel si ça recommence à planter)

- **`@vercel/blob`'s `get()` renvoie 403 en local** (script Node hors Vercel) même avec un
  `BLOB_READ_WRITE_TOKEN` valide — mais fonctionne correctement une fois réellement exécuté
  comme fonction Vercel (testé et confirmé sur le déploiement réel). Semble être une
  particularité du mode "private storage" (encore en beta) hors de l'infra Vercel. Ne pas
  perdre de temps à reproduire ça en local — tester directement sur un déploiement preview.
- **PowerShell + `Invoke-WebRequest` sans `-UseBasicParsing`** peut planter en mode non
  interactif sur Windows PowerShell 5.1 (tente d'utiliser le moteur de parsing IE). Toujours
  ajouter `-UseBasicParsing`, ou utiliser `vercel curl` / `npx vercel curl` à la place.
