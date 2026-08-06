# AI_PROMPTS.md — Prompts système et routes IA (Iron Bike Race Einsiedeln)

## Vue d'ensemble des routes

| Route | Usage | Streaming | Output |
|---|---|---|---|
| `POST /api/ai` | Génération de campagne marketing | Non | JSON assets |
| `POST /api/participants/count` | Compte réel de participants matchant des filtres | Non | `{ count: number }` |
| `POST /api/participants/stats` | Agrégats structurés sur un pool filtré | Non | `{ stats: ParticipantStats \| null }` |
| `POST /api/participants/export` | Export des destinataires d'un segment au format d'import rapidmail | Non | `.xlsx` (`Mailadresse, Vorname, Extra1, Startnummer`) |

**Supprimées** (voir `IRONBIKE_BRIEF.md` §4.1ter — avec seulement 6-7 champs réellement
filtrables, ces mécanismes IA ne faisaient que recombiner les mêmes filtres sous un nom
différent) :
- `POST /api/ai/parse-segment` (langage naturel → filtres)
- `POST /api/ai/suggest-segment` (objectif métier → portrait + filtres + insights)
- `POST /api/ai/analyze-gate` (pool → sous-segments IA, utilisée par `AISubSegments.tsx`,
  composant également supprimé)

---

## Route : génération de campagne (`/api/ai/route.ts`)

### Configuration
```ts
model: "claude-sonnet-4-6"
max_tokens: 3000
stream: false
```

### Input
```ts
{
  gate: 'gate0' | 'gate1' | 'gate2' | 'gate3'
  segment: string                // ex: 'reactivation_kernradius', 'custom_segment'
  channels: Channel[]            // ['feed_post', 'story', 'newsletter'] — validés (400 si inconnu)
  segmentDescription?: string    // injecté pour les segments personnalisés
  segmentSize?: number           // vrai compte, calculé côté client via /api/participants/count
  historicalExamples?: BrandExample[]
  selectedCategories?: Category[]      // Gate 0-2 — CATEGORIES (distances Iron Bike)
  selectedSiblingEvents?: SiblingEvent[]  // Gate 3 uniquement — cross-sell
  channelToRegenerate?: string
  customInstructions?: string
  _dryRun?: boolean
}
```

### Output (JSON, un asset par channel demandé)
```json
{
  "assets": [
    { "channel": "feed_post", "copy": "...", "cta": "...", "visualDirection": "typo|foto|ki_illustration", "meta": "..." },
    { "channel": "story", "editionNumber": "...", "dataPoint": "...", "sentence": "...", "stickerLink": "...", "meta": "..." },
    { "channel": "newsletter", "subject": "...", "preheader": "...", "body": "...", "personalizationFields": ["Vorname"], "meta": "..." }
  ]
}
```

`paid_ad` est **P1** — pas encore de type d'asset ni de prompt. `sms`/`push` n'existent plus
(aucun usage dans le concept Iron Bike).

### System prompts (`lib/ai/prompts.ts`)
Un system prompt par combinaison gate + segment, **en allemand (suisse-allemand)** — décision
validée, voir `IRONBIKE_BRIEF.md` §5. La clé `custom_segment` existe pour chaque gate ; le
contexte du segment personnalisé est injecté via `buildSegmentDescription(segment)` dans le
user prompt (comme pour Sparta).

Clés disponibles :
- `gate0.toute_la_base`, `gate0.custom_segment`
- `gate1.reactivation_kernradius`, `gate1.reactivation_hors_kernradius`,
  `gate1.reactivation_etranger`, `gate1.non_joignable_email`, `gate1.custom_segment`
- `gate2.custom_segment` (seul segment de ce gate — voir `GATES.md`)
- `gate3.toute_la_base`, `gate3.custom_segment`

### Prompt de base (`BASE_PROMPT`, injecté dans tous les system prompts)
```
Du bist der BikeSide Co-Pilot von Datasport. Du erstellst Marketinginhalte für das
Iron Bike Race Einsiedeln — die 30. und letzte Austragung, am 27. September 2026.

Zielgruppe: 38–60 Jahre, mehrheitlich männlich (84%), Wiederholungstäter.

Tonalität — strikt einhalten:
- Trocken, selbstironisch, konkret. Zahlen statt Adjektive.
- Insiderwitze über Schlamm, kaputte Schaltungen, Kettenblätter aus den Neunzigern.
- Du-Form. Kurze Sätze.
- Verboten: Trauerrhetorik, Superlative, "einzigartiges Erlebnis", Emoji-Ketten,
  generische Stockfotos, jede Rechtfertigung dafür, warum Schluss ist.
- Maximal ein Emoji pro Text, und nur wenn es inhaltlich etwas tut.
- Ausnahme Race Week / T-3 bis T-0: Tonwechsel erlaubt — ernst, ohne Pointe, kein Witz mehr.
```

### Contexte par segment (résumé — voir `lib/ai/prompts.ts` pour le texte complet)
- **gate0.toute_la_base** : direct, factuel, presque brutal ("Nach 30 Jahren ist Schluss").
- **gate1.reactivation_\*** : le plus important (Newsletter 2) — nostalgique-mais-sec,
  personnalisation si possible. Nuance géo : kernradius (pas d'excuse anfahrt) /
  hors-kernradius (anfahrt comme rituel) / étranger (voyage comme partie de l'histoire).
- **gate1.non_joignable_email** : contenu pour canal public (feed/story), pas de ciblage
  personnalisé possible (pas d'email).
- **gate2.custom_segment** : deux registres possibles selon la cible décrite — logistique
  sobre pour les inscrits, urgence sans humour pour les non-inscrits (post 14, "Letzter
  Aufruf"). Bascule de ton assumée pour cette phase (T-3 à T-0).
- **gate3.toute_la_base** : bascule sérieuse, remerciement sincère, cross-sell discret
  (deux lignes max, seulement si `selectedSiblingEvents` fourni).

### Helpers (`lib/ai/prompts.ts`)
```ts
buildUserPrompt(params: {
  channels: string[]
  customInstructions?: string
  segmentDescription?: string
  segmentSize?: number
  historicalExamples?: BrandExample[]
  selectedCategories?: Category[]        // 0 = neutre, 1 = spécifique, 2+ = ombrelle
  selectedSiblingEvents?: SiblingEvent[] // mention cross-sell en fin de message
}): string

buildRegeneratePrompt(channel, customInstructions, historicalExamples?, selectedCategories?, selectedSiblingEvents?): string

buildHistoricalExamplesBlock(examples: BrandExample[]): string  // inchangé dans son principe
```

### Tests sans tokens Anthropic
`_dryRun: true` court-circuite Anthropic et retourne un fixture par channel dans le même
format que la vraie réponse. La validation (gate/channel inconnu → 400) s'exécute quand même.
Voir `scripts/test-routes.mjs`.

---

## Routes participants (`app/api/participants/*`)

### `POST /api/participants/count`
```ts
// Input
{ filters: FilterCondition[], scopeFilterGroups?: FilterCondition[][] }
// scopeFilterGroups : union (OR) de groupes de filtres (ex. les segments prédéfinis
// sélectionnés comme scope dans SegmentBuilder) ; filters s'applique en AND par-dessus.
// Output
{ count: number }  // vrai compte, jamais mis à l'échelle
```

### `POST /api/participants/stats`
```ts
// Input identique à /count
// Output
{ stats: ParticipantStats | null }  // voir lib/db/segment-stats.ts — agrégats uniquement
```

`/count` et `/stats` n'exposent **jamais** de champ individuel (nom, email, date de naissance) —
uniquement des comptes et des agrégats. `/export` est l'exception documentée (téléchargement
`.xlsx` explicite au format d'import rapidmail) — voir `DATA_MODEL.md` pour le détail du
modèle serveur.

---

## Brand Voice (inchangé)

`buildHistoricalExamplesBlock` et le contexte Brand Voice (`lib/context/BrandHistoryContext.tsx`)
fonctionnent à l'identique de Sparta — voir `CLAUDE.md`.
