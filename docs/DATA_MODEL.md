# DATA_MODEL.md — Iron Bike Co-Pilot

## Principe général

Contrairement au POC Sparta, la donnée est **réelle** : un export `data/participants.csv`
(gitignoré, jamais commité) de 18 607 personnes ayant déjà participé à l'Iron Bike Race
Einsiedeln, toutes éditions confondues. Voir `IRONBIKE_BRIEF.md` pour le contexte complet.

```
data/participants.csv       → fichier brut, gitignoré, jamais lu côté client
lib/db/participants.ts      → SERVEUR UNIQUEMENT : parsing/nettoyage, cache mémoire
lib/db/segment-filter.ts    → SERVEUR UNIQUEMENT : filterParticipants()
lib/db/segment-stats.ts     → SERVEUR UNIQUEMENT : computeStats() — agrégats structurés
lib/types/participant.ts    → type Participant
lib/types/segments.ts       → types segments personnalisés + constantes UI
lib/segments/predefined.ts  → métadonnées des segments prédéfinis (safe client + serveur)
app/api/participants/*      → seul point d'accès du client aux données réelles
```

### Règle absolue : le dataset ne quitte jamais le serveur (sauf export explicite)

`lib/db/participants.ts` et `lib/db/segment-filter.ts` importent des données réelles
(noms, emails, dates de naissance) et ne doivent **jamais** être importés depuis un composant
`'use client'`. Le client n'accède aux données que via `app/api/participants/count` et
`app/api/participants/stats`, qui ne renvoient que des agrégats (un compteur, ou un objet
`ParticipantStats` structuré) — jamais un JSON avec la liste des participants.

Vérification faite lors de cette migration : le build Next.js confirme que les pages gate
pèsent ~4 kB (First Load JS), ce qui exclut que le dataset de 18 607 lignes soit bundlé
côté client.

**Exception** : `app/api/participants/export/route.ts` — pas d'intégration avec l'outil
d'envoi (rapidmail), l'organisateur exporte donc manuellement la liste des destinataires d'un
segment pour la charger côté rapidmail. `lib/db/segment-export.ts` (`toRapidmailXlsx`) construit
un `.xlsx` server-side à partir du même `filterParticipants(...)` que `/count`/`/stats`, avec
exactement les colonnes attendues par l'import rapidmail (format fourni par l'équipe) :
`Mailadresse, Vorname, Extra1, Startnummer`. Seuls `Mailadresse` (`email`) et `Vorname`
(`firstName`) sont remplis ; `Extra1` (langue) et `Startnummer` restent vides — la
segmentation par langue se fait en amont (le segment lui-même est déjà filtré par
nationalité/geoZone), pas colonne par colonne dans ce fichier. Seules les personnes avec un
email sont incluses. Déclenché uniquement par un clic explicite ("Export for rapidmail" dans
`SegmentBuilder` et `SegmentStatsDrawer`) — jamais un listing automatique, toujours derrière
l'auth `demo_access`.

---

## Chargement et nettoyage (`lib/db/participants.ts`)

`getParticipants()` charge `data/participants.csv` une fois (cache mémoire), avec :

- **Délimiteur auto-détecté** (`,` ou `;`).
- **Bruit exclu** : lignes où `firstName`/`lastName` ressemble à un placeholder
  (répétition d'une seule lettre type "Aaa"/"Bbb", chaîne purement numérique, ou motif
  `Refnr=12345`). Heuristique approximative documentée dans le code — pas de moyen de
  cibler exactement les ~28 lignes mentionnées dans `IRONBIKE_BRIEF.md` §1.2 sans lire les
  données personnelles.
- **Dédup** : par clé combinée `email + prénom + nom + date de naissance` (pas email seul,
  pour ne pas fusionner des membres d'une même famille partageant un email).
- **Champs manquants jamais inventés** : `gender` vide → `'unknown'`, `birthDate`/`age`
  absents → `undefined`, jamais estimés.
- **`geoZone`** : bucket approximatif par préfixe NPA (voir `IRONBIKE_BRIEF.md` §2.2) — pas
  une distance calculée. P1 : géocodage précis.

`getParticipants()` fusionne automatiquement avec la liste des inscrits 2026 dès que
`data/Angemeldete Teilnehmende Iron Bike.xlsx` existe localement (même nom exact attendu par
chaque collègue) — pas d'étape manuelle, remplacer le fichier suffit à mettre à jour le statut
au prochain redémarrage du serveur. `mergeRegistrationStatus(participants, registeredList)` et
`findPrimoInscrits(...)` (inverse — inscrits sans aucun match historique, voir plus bas)
partagent le même index à 4 paliers, du plus fiable au moins fiable : nom + date de naissance,
nom + email ensemble, email seul, nom seul. Les deux paliers "seul" ne s'activent que si
l'autre champ est **réellement absent** côté inscrits — pas juste différent — précisément pour
éviter qu'un email partagé en famille dans `participants.csv` fasse matcher plusieurs personnes
différentes sur la seule base de cet email. Une fois la liste chargée, tout participant non
matché devient `'not_registered'` ; sans fichier, tout le monde reste `'unknown'`.

Sur le fichier réel actuel (colonnes Vorname/Nachname/Geschlecht/E-Mail, pas de date de
naissance) : seul le palier nom+email s'active, ce qui a corrigé un sur-matching réel — voir
`scripts/validate-participants.mjs` pour le calcul (agrégats uniquement) et
`IRONBIKE_BRIEF.md` §4.1bis. Le taux de match n'est cependant jamais garanti à 100% (noms mal
orthographiés, emails changés) — ne pas s'appuyer sur `registrationStatus2026` seul pour
exclure une liste réelle sans repasser par l'export onreg.

Le point d'entrée d'upload (écran de dépôt du fichier) reste **P1** — le fichier se dépose
pour l'instant directement dans `data/`, comme `participants.csv`.

### Fallback Vercel Blob (déploiement)

`data/` est gitignoré : sur Vercel, ces fichiers n'existent pas dans le déploiement.
`readLocalOrBlob()` dans `lib/db/participants.ts` lit `data/participants.csv` normalement en
local, et bascule sur un store Vercel Blob privé (`participants.csv` / `registered-2026.xlsx`)
quand le fichier local est absent. Voir `docs/DEPLOYMENT.md` pour la configuration complète et
comment rafraîchir les données Blob après une mise à jour locale.

---

## Profil participant (`lib/types/participant.ts`)

```ts
export type GeoZone = 'kernradius' | 'innerschweiz' | 'reste_suisse' | 'etranger' | 'unknown'

export type Participant = {
  id: string                  // hash stable (pas de Refnr fiable dans la source)
  firstName: string
  lastName: string
  gender: 'M' | 'F' | 'unknown'
  birthDate?: string          // ISO, undefined si absent dans la source
  age?: number                // dérivé, undefined si birthDate absent
  nationality: string         // code IOC brut (SUI, GER, ...) ou 'unknown'
  email?: string
  hasEmail: boolean
  zip?: string
  town?: string
  geoZone: GeoZone

  hasParticipatedBefore: true // vrai pour 100% du dataset

  registrationStatus2026: 'registered' | 'not_registered' | 'unknown'
  raceResult2026?: 'finisher' | 'dnf' | 'dns'  // rempli seulement après import post-course (P1)
}
```

Champs Sparta explicitement abandonnés (aucune source réelle) : `engagement`,
`totalEditionsApplied/Raced`, `isReturningAthlete`, `candidacyScore`, `anticipatedValue`,
`selectionProbability`, `preLotterySegment`/`postLotterySegment`/`postRaceSegment`,
`upsellsPurchased`, `personalBest`, `reRegistrationProbability`.

---

## Filtrage (`lib/db/segment-filter.ts`)

```ts
export function filterParticipants(
  filters: FilterCondition[],
  scopeFilterGroups?: FilterCondition[][]   // OR entre groupes, AND à l'intérieur d'un groupe
): Participant[]
```

`scopeFilterGroups` remplace le `baseSegmentIds` + `segmentField` de Sparta : chaque groupe
est un segment prédéfini sélectionné comme scope dans le `SegmentBuilder`. Sans champ DB dédié
(pas de `gate0Segment`/`postLotterySegment` — ces champs n'existent pas pour Iron Bike), tous
les segments, prédéfinis ou personnalisés, se réduisent à des `FilterCondition[]`.

**Champs filtrables (7 champs, `lib/types/segments.ts`)** :

| FilterField | Type | Description |
|---|---|---|
| `gender` | select | 'M' \| 'F' \| 'unknown' |
| `age_min` / `age_max` | number | âge ≥ / ≤ valeur |
| `nationality` | select | code IOC (SUI, GER, AUT, ITA, FRA, unknown) |
| `geoZone` | select | valeur unique ou liste séparée par virgule (OR), ex. `innerschweiz,reste_suisse` |
| `hasEmail` | boolean | 'true' \| 'false' |
| `registrationStatus2026` | select | 'registered' \| 'not_registered' \| 'unknown' |

Pas de champs `total_editions_*`, `engagement_min`, `city_contains`, `distance`,
`hasInsurance` : aucune donnée réelle ne les alimente (voir `IRONBIKE_BRIEF.md` §2.1/§4.1ter).

---

## Statistiques (`lib/db/segment-stats.ts`)

```ts
export function computeStats(pool: Participant[]): ParticipantStats | null
```

Retourne un objet structuré (pas une string de prompt — les routes IA de découverte par
stats ont été supprimées, voir `AI_PROMPTS.md`) : `total`, `hasEmailPct`, répartition genre,
tranches d'âge, `geoZones`, `nationalities`, `registrationStatus`. Utilisé exclusivement par
`app/api/participants/stats/route.ts`, consommé par `SegmentStatsDrawer`.

---

## Segments — types (`lib/types/segments.ts`)

```ts
export interface FilterCondition { id: string; field: FilterField; value: string }

export interface CustomSegment {
  id: string; name: string; color: string; colorBg: string
  filters: FilterCondition[]
  baseSegmentIds: string[]    // segments prédéfinis sélectionnés comme scope — vide = tous
  baseSegmentLabels: string[]
  objective?: string
}
```

`buildSegmentDescription(segment)` inchangé dans son principe (Scope / Critères / Objectif),
adapté aux nouveaux champs.

## Segments prédéfinis (`lib/segments/predefined.ts`)

Métadonnées pures (pas de données participant) — importables aussi bien côté client (pages
gate, `SegmentBuilder`) que côté serveur (`app/api/ai/route.ts`, pour calculer la taille réelle
du segment envoyée au prompt). Voir `GATES.md` pour le détail par gate.

---

## Comptage — plus de mise à l'échelle

Contrairement à Sparta (`scaledCount = rawCount / DB_SIZE * effectiveTotal`), les nombres
affichés sont **les vrais comptes**, calculés à la volée par `filterParticipants(...).length`
côté serveur et exposés via `POST /api/participants/count`. Aucune constante `SEGMENT_SIZES`
n'existe plus dans `lib/constants.ts`.

---

## `lib/constants.ts`

```ts
export const EVENT = { name: 'Iron Bike Race Einsiedeln', edition: 30, isLastEdition: true, raceDate: '2026-09-27', ... }
export const CATEGORIES: Category[]       // distances/courses Iron Bike (remplace RACES)
export const SIBLING_EVENTS: SiblingEvent[]  // cross-sell Gate 3 uniquement
export const CHANNELS = ['feed_post', 'story', 'newsletter'] as const  // P0 ; paid_ad = P1
```
