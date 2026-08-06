# CLAUDE.md — Instructions globales pour Claude Code

## Contexte du projet

Iron Bike Co-Pilot est un outil de marketing automation pour l'organisateur de l'Iron Bike
Race Einsiedeln (BikeSide) — la **30ᵉ et dernière édition**, le 27 septembre 2026. Ce repo est
un fork dédié du POC Sparta Co-Pilot (Copenhagen Marathon) : l'architecture générale est
reprise, mais les données, le modèle, les segments et les prompts sont entièrement reconfigurés
pour ce client et cet événement. Voir `IRONBIKE_BRIEF.md` pour le détail complet de l'adaptation
et les décisions prises, `STATUS.md` pour l'état actuel du projet, et `docs/DEPLOYMENT.md` pour
le déploiement Vercel.

**Contrairement à Sparta, la donnée est réelle** (18 607 personnes ayant déjà participé,
export `data/participants.csv`, gitignoré) — pas une DB fictive générée pour la démo. Toutes
les règles de confidentialité ci-dessous en découlent directement.

Stack : Next.js 15 (App Router), TypeScript, Tailwind CSS, Anthropic API, ExcelJS (xlsx),
Vercel Blob (fallback données en prod, voir `docs/DEPLOYMENT.md`).

---

## Structure du projet

```
ironbike-copilot/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         (redirect vers /gate/registration)
│   ├── brand-voice/
│   │   └── page.tsx                     (Brand Voice — upload historique campagnes)
│   ├── campaigns/
│   │   └── page.tsx                     (campagnes sauvegardées)
│   ├── gate/
│   │   ├── creation/page.tsx            (Gate 0 — Ankündigung)
│   │   ├── registration/page.tsx        (Gate 1 — Anmeldephase)
│   │   ├── lottery/page.tsx             (Gate 2 — Race Week)
│   │   └── finish/page.tsx              (Gate 3 — Renntag & danach)
│   └── api/
│       ├── ai/
│       │   └── route.ts                 (génération campagne — tool-use Anthropic)
│       └── participants/
│           ├── count/route.ts           (compte réel filtré)
│           ├── stats/route.ts           (agrégats structurés filtrés)
│           ├── export/route.ts          (export xlsx destinataires — format rapidmail)
│           └── primo-inscrits/route.ts  (compte inscrits 2026 jamais vus dans l'historique)
├── lib/
│   ├── db/
│   │   ├── participants.ts              (SERVEUR UNIQUEMENT — parsing CSV réel + fallback Blob)
│   │   ├── segment-filter.ts            (SERVEUR UNIQUEMENT — filterParticipants)
│   │   ├── segment-stats.ts             (SERVEUR UNIQUEMENT — computeStats)
│   │   └── segment-export.ts            (SERVEUR UNIQUEMENT — toRapidmailXlsx)
│   ├── segments/
│   │   └── predefined.ts                (métadonnées segments prédéfinis — safe client+serveur)
│   ├── hooks/
│   │   └── useParticipantCounts.ts      (client — fetch vers /api/participants/count)
│   ├── utils/
│   │   └── exportSegment.ts             (client — déclenche le téléchargement de l'export)
│   ├── types/
│   │   ├── participant.ts               (type Participant complet)
│   │   ├── segments.ts                  (FilterField, FilterCondition, CustomSegment, ...)
│   │   └── brandHistory.ts              (interface BrandExample)
│   ├── context/
│   │   ├── CampaignHistoryContext.tsx   (historique campagnes sauvegardées)
│   │   └── BrandHistoryContext.tsx      (exemples historiques + parsing xlsx/csv)
│   ├── ai/
│   │   └── prompts.ts                   (system prompts allemands + buildUserPrompt)
│   └── constants.ts                     (EVENT, CATEGORIES, SIBLING_EVENTS, CHANNELS)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── gates/
│   │   ├── GateTimeline.tsx
│   │   ├── SegmentCard.tsx
│   │   ├── ChannelSelector.tsx
│   │   ├── SegmentBuilder.tsx           (Nom → Scope → Filtres manuels → Objectif → Compteur)
│   │   └── SegmentStatsDrawer.tsx       (fetch /api/participants/stats)
│   └── campaign/
│       ├── CampaignGenerator.tsx
│       ├── AssetCard.tsx
│       └── RegeneratePrompt.tsx
└── data/
    └── participants.csv                 (gitignoré — jamais commité, jamais lu côté client)
```

---

## Design system — règles strictes

### Polices
Trois fichiers woff2 dans `/public/fonts/` :
- `Saans-Regular.woff2` (weight 400)
- `Saans-Medium.woff2` (weight 570)
- `SaansMono-Regular.woff2` (weight 380)

Déclarées dans `globals.css` via `@font-face`.
Ne jamais utiliser d'autre police.

### Couleurs
Utiliser exclusivement les CSS variables définies dans `globals.css`.
Ne jamais écrire de valeurs hex directement dans les composants (les couleurs de segments
personnalisés/prédéfinis, définies en hex dans `lib/segments/predefined.ts` et
`CUSTOM_SEGMENT_COLORS`, sont l'exception documentée — même logique que Sparta).

Variables principales :
```css
--primary: var(--color-red-700)        /* #D6001D — rouge Datasport */
--secondary: var(--color-grey-900)     /* #141414 — noir sidebar */
--fg-1: var(--color-grey-900)          /* texte principal */
--fg-2: var(--color-grey-700)          /* texte secondaire */
--fg-3: var(--color-grey-500)          /* texte tertiaire */
--bg-1: var(--color-white)             /* surface */
--bg-2: var(--color-grey-50)           /* surface subtile */
--border-1: var(--color-grey-200)      /* bordure légère */
```

### Tailwind
Tailwind est utilisé uniquement pour le layout (flex, grid, gap, padding, margin).
Jamais pour les couleurs, polices ou border-radius — utiliser les CSS vars.

---

## Données — règles strictes (⚠️ données réelles, pas une démo)

### Fichier source
`data/participants.csv` — export réel de 18 607 personnes (noms, emails, dates de naissance).
**Gitignoré, jamais commité.** Chaque collègue place sa propre copie locale dans `data/`
(distribution hors-git, voir `IRONBIKE_BRIEF.md` §7bis). Colonnes : `firstName, lastName,
gender, birthDate, nationIOC, email, zip, town, Status` (`Status` toujours vide, ignorée).

### Le dataset ne quitte jamais le serveur (sauf export explicite)
- `lib/db/participants.ts` et `lib/db/segment-filter.ts` importent le CSV réel — **ne jamais
  les importer depuis un composant `'use client'`**. Seules les routes serveur
  (`app/api/participants/*`, `app/api/ai/route.ts`) les utilisent.
- Le client n'accède aux données que via `POST /api/participants/count` (`{ count }`),
  `POST /api/participants/stats` (`{ stats: ParticipantStats }`) et
  `POST /api/participants/export` (xlsx, voir ci-dessous) — jamais un JSON contenant une liste
  de participants individuels.

### Exception documentée : export xlsx d'un segment (`app/api/participants/export/route.ts`)
Pas d'intégration avec l'outil d'envoi (rapidmail) — l'organisateur exporte donc manuellement
la liste des destinataires d'un segment pour l'importer côté rapidmail. `lib/db/segment-export.ts`
(`toRapidmailXlsx`) construit un `.xlsx` avec **exactement les colonnes attendues par l'import
rapidmail** (format fourni par l'équipe) : `Mailadresse, Vorname, Extra1, Startnummer`.
`Mailadresse` = `email`, `Vorname` = `firstName`. Seules les personnes avec un email sont
incluses (une ligne sans `Mailadresse` est inutilisable pour l'import). `Extra1` et
`Startnummer` restent vides — la segmentation par langue se fait en amont dans l'outil
(nationalité/geoZone du segment), pas ligne par ligne dans ce fichier ; `Startnummer` n'a pas
d'équivalent avant course. Déclenché uniquement par un clic explicite ("Export for rapidmail"
dans `SegmentBuilder` et `SegmentStatsDrawer`, via `lib/utils/exportSegment.ts` côté client) —
jamais automatique, jamais bundlé, toujours derrière l'auth `demo_access`. Ce n'est pas une
régression de la règle ci-dessus : c'est un téléchargement ponctuel et volontaire, pas une API
de listing.
- Vérification à refaire après toute modification de ce périmètre : `npm run build` doit
  produire des pages `gate/*` de quelques kB (First Load JS) — une régression ferait gonfler
  ce chiffre de plusieurs Mo si le dataset se retrouvait bundlé côté client.

### Chiffres UI — toujours réels
Contrairement à Sparta (`SEGMENT_SIZES` hardcodé dans `lib/constants.ts`), **aucun chiffre de
segment n'est fabriqué**. Tous les compteurs viennent de `filterParticipants(...).length`,
exposés côté client via `/api/participants/count`. Pas de mise à l'échelle (`DB_SIZE`/
`scaledCount`) : le dataset réel est déjà à la bonne échelle.

### Champs jamais fabriqués
`registrationStatus2026` reste `'unknown'` par défaut pour tout le monde et doit être traité
comme un vrai inconnu (jamais équivalent à `false`) dans l'UI et les prompts. Pas de score
d'engagement simulé, pas de nombre d'éditions couru inventé — ces champs n'existent pas dans
le modèle `Participant` (voir `lib/types/participant.ts`).

### Filtrage (`lib/db/segment-filter.ts`)
```ts
export function filterParticipants(
  filters: FilterCondition[],
  scopeFilterGroups?: FilterCondition[][]  // OR entre groupes, AND à l'intérieur d'un groupe
): Participant[]
```
Pas de champ dérivé façon `gate0Segment` (Sparta) : aucun segment n'a de champ DB dédié pour
Iron Bike, tout se réduit à des `FilterCondition[]` — prédéfinis ou personnalisés.

---

## Segments — fonctionnement

Chaque gate qui en propose permet à l'organisateur de créer des segments personnalisés via
`SegmentBuilder`. Ces segments existent uniquement en mémoire React (pas de persistance) et
disparaissent au rechargement.

### Types (`lib/types/segments.ts`)

```ts
type FilterField =
  | 'gender' | 'age_min' | 'age_max' | 'nationality' | 'geoZone' | 'hasEmail'
  | 'registrationStatus2026'

interface FilterCondition { id: string; field: FilterField; value: string }

interface CustomSegment {
  id: string; name: string; color: string; colorBg: string
  filters: FilterCondition[]
  baseSegmentIds: string[]    // segments prédéfinis sélectionnés comme scope — vide = tous
  baseSegmentLabels: string[]
  objective?: string
}
```

### SegmentBuilder (`components/gates/SegmentBuilder.tsx`)
Réduit par rapport à Sparta — pas de section IA (langage naturel / objectif métier), voir
`IRONBIKE_BRIEF.md` §4.1ter :
1. **Nom**
2. **Scope** — pills des segments prédéfinis du gate (absent si le gate n'en a pas, ex. Gate 2)
3. **Filtres** manuels (7 champs)
4. **Objectif & contexte** — texte libre injecté dans le prompt de génération
5. **Compteur** — vrai compte via `POST /api/participants/count` (debounce 250ms)

### Segments prédéfinis (`lib/segments/predefined.ts`)
Métadonnées pures (`id`, `label`, `icon`, `color`, `filters`, `channels`, `objective`, ...) —
safe à importer côté client ET serveur puisqu'aucune donnée participant n'y figure. Utilisé
par les pages gate pour l'affichage, et par `app/api/ai/route.ts` pour situer le contexte du
segment dans le prompt. Voir `GATES.md` pour le détail par gate — Gate 0 et 3 n'ont qu'un
segment agrégé (`toute_la_base`), Gate 1 en a 4 (géo/email), Gate 2 n'en a aucun (filtres
manuels uniquement, décision produit).

### Affichage dans les gates
- Header colonne gauche : `[LABEL] [total participants réel] [+ Créer un segment]` (bouton
  absent sur Gate 0)
- Segments prédéfinis : `SegmentCard` en liste verticale (absent sur Gate 2)
- Segments custom : rows sous les prédéfinis, compteur réel, boutons Edit/delete

---

## API Claude — règles strictes

### Route principale : génération de campagne
```ts
// app/api/ai/route.ts
model: "claude-sonnet-4-6"
max_tokens: 3000
stream: false
// Paramètres du body :
gate: string                     // 'gate0' | 'gate1' | 'gate2' | 'gate3'
segment: string                  // ex: 'reactivation_kernradius', 'custom_segment'
channels: Channel[]              // ['feed_post', 'story', 'newsletter'] — validés (400 si inconnu)
segmentDescription?: string      // injecté pour les segments custom
segmentSize?: number             // vrai compte, calculé côté client
historicalExamples?: BrandExample[]
selectedCategories?: Category[]        // Gate 0-2 — distances Iron Bike
selectedSiblingEvents?: SiblingEvent[] // Gate 3 uniquement — cross-sell
channelToRegenerate?: string
customInstructions?: string
_dryRun?: boolean
```

### System prompts
Définis dans `lib/ai/prompts.ts`, **en allemand (suisse-allemand)** — décision validée, voir
`IRONBIKE_BRIEF.md` §5. Un system prompt par combinaison gate + segment. La clé
`custom_segment` existe pour chaque gate — contexte injecté via `buildSegmentDescription()`.
Ne jamais écrire les prompts directement dans les composants. Voir `AI_PROMPTS.md` pour le
détail complet et le prompt de base.

### Format de réponse (génération campagne)
Claude répond en JSON structuré, un asset par channel demandé (`feed_post`, `story`,
`newsletter` — voir `AI_PROMPTS.md` pour le contrat exact des champs par channel). Parser
avec un try/catch côté client, fallback propre sans crash en cas de JSON malformé.

### Streaming
Aucune route ne streame — `await client.messages.create()`.

### Tests sans tokens Anthropic
`_dryRun: true` court-circuite Anthropic et retourne un fixture par channel dans le même
format que la vraie réponse. Voir `scripts/test-routes.mjs` et `docs/TESTING.md`.

### Pre-commit hook
`scripts/pre-commit.mjs` tourne automatiquement avant chaque `git commit` :
1. TypeScript (`npx tsc --noEmit`) — toujours, bloquant
2. Route health checks (`scripts/test-routes.mjs`) — seulement si `localhost:3000` répond

Installé automatiquement via `prepare` à chaque `npm install`.

---

## Sélecteurs de contenu (`CampaignGenerator`)

Deux modes exclusifs, selon `promoMode` :
- **`categories`** (Gate 0-2, par défaut) — sélection de `CATEGORIES` (distances Iron Bike :
  lang/mittel/kurz/vintage/easy_ride/e_mtb/kids). 0 coché = neutre, 1 = spécifique, 2+ =
  message ombrelle.
- **`siblingEvents`** (Gate 3 uniquement) — cross-sell vers `SIBLING_EVENTS` (autres Bike
  Marathon Classics). Rien coché par défaut (décision D du concept, optionnelle).

---

## Assets générés — un type par channel

`AssetCard` n'a **pas** de logique d'upload d'image, de QR code ou de preview réseau social
(contrairement à Sparta) — le concept Iron Bike ne prévoit pas de génération d'images ni de
formats email/SMS/push/Instagram/LinkedIn/Facebook. Trois types d'assets :

| Channel | Champs |
|---|---|
| `feed_post` | `copy`, `cta`, `visualDirection` ('typo'\|'foto'\|'ki_illustration'), `meta` |
| `story` | `editionNumber?`, `dataPoint`, `sentence`, `stickerLink?`, `meta` |
| `newsletter` | `subject`, `preheader`, `body`, `personalizationFields?`, `meta` |

`paid_ad` est **P1** (pas de type d'asset ni de prompt encore). Édition inline (input/textarea
sans bordure visible, save via `onSave(editedAsset)`) conservée du pattern Sparta.

---

## Brand Voice — historique campagnes

Feature inchangée par rapport à Sparta (`app/brand-voice/page.tsx`,
`lib/context/BrandHistoryContext.tsx`) — upload xlsx/csv d'exemples passés, filtrage par
gate/segment/channel, injection dans le prompt via `buildHistoricalExamplesBlock`. En mémoire
uniquement, disparaît au rechargement.

---

## Comportements critiques pour le lancement (5.8.2026)

1. **Navigation entre gates instantanée** — le fetch des compteurs (`/api/participants/count`)
   se fait en arrière-plan, sans bloquer l'affichage des cartes.
2. **Génération < 8 secondes** — loader engageant pendant l'attente.
3. **Régénération d'un channel seul** — ne régénère pas les autres assets.
4. **JSON malformé** — fallback propre, pas de crash.
5. **Jamais de données participant individuelles côté client** — voir section Données.
6. **Segments custom + Brand Voice en mémoire uniquement** — pas de persistance.
7. **Statut d'inscription 2026 inconnu** — bannière explicite sur Gate 1, jamais un silence.

---

## Ce que cet outil ne fait PAS

- Pas de génération d'images via IA
- Pas de base de données réelle *gérée par l'outil* — le CSV réel est chargé, nettoyé et mis
  en cache en mémoire serveur, jamais persisté ailleurs
- Pas d'envoi réel de campagnes ("Approve & schedule" est un bouton UI sans action)
- Pas de liste d'événements — un seul event, Iron Bike Race Einsiedeln 2026 (30ᵉ, dernière)
- Pas de persistance des segments personnalisés (mémoire React uniquement)
- Pas de persistance des exemples Brand Voice (mémoire React uniquement)
- Pas d'écran d'upload pour la liste des inscrits 2026 ou les résultats de course (P1 — la
  fonction de merge existe déjà, voir `lib/db/participants.ts`)
