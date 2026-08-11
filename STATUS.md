# Iron Bike Co-Pilot — État du projet

_Dernière mise à jour : 6.8.2026._

## Comment lancer le projet

```bash
npm install
npm run dev
# → http://localhost:3000
```

Nécessite `.env.local` (voir `.env.example`) + ta copie locale de `data/participants.csv`
(et optionnellement `data/Angemeldete Teilnehmende Iron Bike.xlsx` et
`data/mtb_myds_users_export_2026_08_07_1616.xlsx`) — distribution hors-git, voir
`IRONBIKE_BRIEF.md` §7bis. Sans ces fichiers en local, l'app essaie de les lire depuis
Vercel Blob (voir `docs/DEPLOYMENT.md`) — utile pour le déploiement, pas pour le dev quotidien.

---

## Ce qui fonctionne

- Navigation entre les 4 gates (Gate 0 → 3), segments prédéfinis + personnalisés
- Compteurs et statistiques réels (`/api/participants/count`, `/stats`) sur les 18 607
  participants historiques
- Génération de campagne via Claude (`POST /api/ai`) — **tool-use forcé** (schéma JSON strict),
  fiable même quand le texte généré contient des citations/guillemets. Régénération d'un
  channel seul.
- **Export destinataires d'un segment** (`POST /api/participants/export`) — `.xlsx` au format
  d'import rapidmail (`Mailadresse, Vorname, Extra1, Startnummer`), bouton dans `SegmentBuilder`
  et `SegmentStatsDrawer`. Voir `docs/DATA_MODEL.md`.
- Statut d'inscription 2026 (`registrationStatus2026`) fusionné automatiquement si
  `data/Angemeldete Teilnehmende Iron Bike.xlsx` est présent — **mais pas appliqué par défaut**
  aux segments prédéfinis de réactivation (Gate 1) : il faut ajouter le filtre
  `registrationStatus2026 = not_registered` manuellement via "Create a segment" pour exclure
  les déjà-inscrits avant un envoi réel. Décision produit, pas un oubli — voir la bannière sur
  Gate 1 et `GATES.md`.
- **Prospects MTB (nouvelle source)** — export myDS réel (`data/mtb_myds_users_export_*.xlsx`,
  gitignoré) de 57 837 personnes ayant fait au moins une course MTB Datasport (hors Iron Bike)
  ces 5 ans. Comble le trou documenté dans `IRONBIKE_BRIEF.md` §4.1ter ("nouveaux prospects
  jamais inscrits" n'existait dans aucune donnée disponible). Chargé par `lib/db/prospects.ts`,
  fusionné au pool `participants.csv` via un champ `source: 'iron_bike_history' | 'mtb_prospect'`
  filtrable dans `SegmentBuilder` sur n'importe quelle gate. Nettoyage appliqué avant exposition :
  consentement newsletter réel (`nl_sportnews_abo=1`, pas désabonné), dédoublonnage email contre
  `participants.csv` et `Angemeldete Teilnehmende Iron Bike.xlsx` (~24 400 prospects mailables
  au final). Nouveaux segments prédéfinis sur Gate 1 : `prospects_mtb_kernradius/
  hors_kernradius/etranger`. Voir `docs/DATA_MODEL.md` pour le détail.
- Brand Voice (upload xlsx/csv d'exemples passés, injection dans le prompt)
- **Déployé sur Vercel** (preview) — voir `docs/DEPLOYMENT.md` pour le détail complet
  (projet, Blob storage, env vars, comment redéployer/rafraîchir les données)
- Repo GitHub : `https://github.com/rmalet-datasport/ironbike-copilot` (compte `rmalet-datasport`,
  team Vercel `datasport`)

## Ce qui reste à faire / décider

### 🟡 Déploiement — encore en preview, pas en production
Le preview Vercel fonctionne de bout en bout (auth, comptage, export, génération IA réelle,
toutes testées). Reste à décider : promouvoir en prod (`vercel deploy --prod`) quand prêt.

### 🟡 Infra self-hosted obsolète (`.github/workflows/deploy.yml`, `docker-compose.prod.yml`)
Ces fichiers déploient vers un serveur self-hosted (`lab.datasport.com` via SSH/Docker) — c'est
l'ancien plan. Le déploiement réel se fait maintenant sur Vercel (voir `docs/DEPLOYMENT.md`).
Ces 2 fichiers ne sont plus utilisés ; à supprimer ou à adapter si le projet en a encore besoin
un jour (ex. instance interne permanente en plus de Vercel).

### 🟡 Rafraîchir les données Blob après mise à jour locale
`data/participants.csv` et la liste des inscrits 2026 sont uploadés une fois sur Vercel Blob
pour que le déploiement fonctionne (voir `docs/DEPLOYMENT.md` — commandes `vercel blob put`).
Si le fichier local change (nouvelle liste d'inscrits, correction de données), il faut
re-uploader manuellement — pas de synchro automatique.

### 🟢 Fichier non identifié
`docs/Sparta Co-Pilot - standalone.html` — mockup visuel bundlé (contient des occurrences de
"Copenhagen"), donc probablement une maquette de l'ancien POC Sparta gardée comme référence
design. N'est importé par aucun code. À confirmer avec l'équipe si encore utile, sinon à
supprimer.

### 🟢 Double lockfile (`package-lock.json` + `yarn.lock`)
Les deux sont présents et synchronisés (`npm install` met à jour les deux). Vercel a utilisé
Yarn au build (détecté en premier). Fonctionne, mais si ça devient une source de confusion,
choisir un seul gestionnaire de paquets et supprimer l'autre lockfile.

### 🟢 P1 documentés (non bloquants, voir `CLAUDE.md` "Ce que cet outil ne fait PAS")
- Pas d'écran d'upload pour la liste des inscrits 2026 / résultats de course (dépôt manuel dans
  `data/` pour l'instant)
- Géocodage précis des `geoZone` (actuellement un bucket approximatif par préfixe NPA)
- Renommer les dossiers de route (`gate/lottery` etc. gardent des noms hérités de Sparta,
  cosmétique uniquement — voir `GATES.md`)

---

## Stack & config

- Next.js 15.5.19 — App Router
- Node.js 24.x
- Anthropic SDK 0.105.0 (tool-use)
- ExcelJS (xlsx) — parsing local et Vercel Blob
- `@vercel/blob` — fallback de données en production
- Tailwind CSS 4
- Déployé sur Vercel (team `datasport`) — voir `docs/DEPLOYMENT.md`
