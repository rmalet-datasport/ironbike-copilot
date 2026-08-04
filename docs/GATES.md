# GATES.md — Spec fonctionnelle des 4 gates (Iron Bike Race Einsiedeln)

## Principe général

Il n'y a pas de tirage au sort pour l'Iron Bike (inscription ouverte, premier arrivé). Les 4
gates représentent des **phases temporelles de la campagne** (voir `IRONBIKE_BRIEF.md` §4),
pas des étapes d'un tirage :

| Gate (route)                 | Nom affiché            | Période            |
| ----------------------------- | ---------------------- | ------------------ |
| `gate/creation` (Gate 0)     | **Ankündigung**         | Mi 5.8 – Ve 7.8    |
| `gate/registration` (Gate 1) | **Anmeldephase**        | Ve 7.8 – Di 20.9   |
| `gate/lottery` (Gate 2)      | **Race Week**           | Me 16.9 – Ve 25.9  |
| `gate/finish` (Gate 3)       | **Renntag & danach**    | Sa 26.9 – Me 30.9+ |

Les noms de route restent ceux de Sparta (P0 — cosmétique, P1 pour renommer les dossiers).

**Chiffres réels, jamais fabriqués** : contrairement à Sparta (`SEGMENT_SIZES` hardcodé), tous
les compteurs affichés viennent de `POST /api/participants/count` sur le dataset réel. Aucun
KPI inventé (pas d'`avgCandidacyScore`, `upsellRevenue`, etc. — ces champs n'existent pas pour
Iron Bike, voir `DATA_MODEL.md`).

---

## Layout commun

```
[KPI strip — 4 chiffres réels/constants]
[Bannière caveat registrationStatus2026 (gate 1)]

Colonne gauche                                Colonne droite (flex 1)
─────────────────────────────                 ──────────────────────
[LABEL] [total participants] [+ Create...]    [Panel campagne du segment sélectionné]
[Segment Card 1..N] (si le gate en a)         ou
[Segments custom]                              [Empty state]
```

**Segmentation hybride, mais réduite** : avec seulement 6-7 champs réellement filtrables
(voir `DATA_MODEL.md`), les mécanismes IA de découverte (NL → filtres, objectif → segment,
sous-segments) ont été supprimés — voir `AI_PROMPTS.md`. `SegmentBuilder` se limite à
Nom → Scope (si le gate a des segments prédéfinis) → Filtres manuels → Objectif → Compteur.

---

## Gate 0 — Ankündigung

### Quand
Mi 5.8 – Ve 7.8. Post 1 (annonce), Newsletter 1 (à tous), communiqué de presse, Post 2
(appel à photos).

### Segments
Un seul segment agrégé, pas de segmentation fine (Newsletter 1 et Post 1 s'adressent à toute
la base) :

| Segment | Filtres | Channels recommandés |
|---|---|---|
| `toute_la_base` | aucun | newsletter, feed_post |

Pas de bouton "+ Créer un segment" sur ce gate (informationnel uniquement, voir
`IRONBIKE_BRIEF.md` §4.1). Le bouton "View statistics" reste disponible pour une répartition
géo/âge informative.

---

## Gate 1 — Anmeldephase

### Quand
Ve 7.8 – Di 20.9. Posts 3–12, Newsletter 2 (réactivation — **la plus importante**),
Newsletter 3, Newsletter 4, countdown Stories (dès 29.8), vagues Meta.

### Segments prédéfinis

| Segment | Filtres | Channels |
|---|---|---|
| `reactivation_kernradius` | `hasEmail=true`, `geoZone=kernradius` | newsletter, story |
| `reactivation_hors_kernradius` | `hasEmail=true`, `geoZone=innerschweiz,reste_suisse` | newsletter |
| `reactivation_etranger` | `hasEmail=true`, `geoZone=etranger` | newsletter |
| `non_joignable_email` | `hasEmail=false` | — (voir bannière caveat) |

Bannière permanente sur ce gate : *"Statut d'inscription 2026 inconnu pour cette base — à
exclure manuellement via l'export onreg avant tout envoi réel."* Le filtre
`registrationStatus2026` existe dans `SegmentBuilder` dès maintenant (voir
`IRONBIKE_BRIEF.md` §4.1bis) — tant qu'aucune liste d'inscrits n'est chargée, filtrer sur
`registered` renvoie 0.

Le segment "nouveaux prospects jamais inscrits" (ciblage géo + lookalike Meta) n'existe pas
comme filtre : cette audience vit dans Meta Ads Manager, pas dans `participants.csv`.

---

## Gate 2 — Race Week

### Quand
Me 16.9 – Ve 25.9. Posts 13–16, Newsletter 5 (logistique inscrits), countdown items 21–30
(bascule sérieuse dès l'item 27), vague Meta retargeting.

### Segments
**Aucun segment prédéfini** (décision produit — avec si peu de dimensions filtrables, une
pré-segmentation fixe n'apportait rien pour cette phase). Seul le bouton "+ Créer un segment"
est disponible : filtres manuels sur toute la base, notamment pour reproduire le ciblage géo
de Gate 1 pour le post 14 ("Letzter Aufruf") à ton d'urgence envers les non-inscrits.

Newsletter 5 ("an Angemeldete") s'adresse aux inscrits — une donnée que l'outil n'a pas
(voir `registrationStatus2026`). Recommandation du brief : envoyer via une liste extraite
d'onreg plutôt que ce dataset ; l'outil peut néanmoins générer le contenu.

Le system prompt `gate2.custom_segment` gère les deux registres (logistique sobre pour les
inscrits / urgence sans humour pour les non-inscrits) selon le contexte décrit par
l'organisateur — voir `AI_PROMPTS.md`.

---

## Gate 3 — Renntag & danach

### Quand
Sa 26.9 – Me 30.9+. Stories live jour J, post du soir, Newsletter 6, post de clôture,
cross-sell vers les autres Bike Marathon Classics.

### Segments prédéfinis

| Segment | Filtres | Channels |
|---|---|---|
| `toute_la_base` | aucun | newsletter, feed_post, story |

Pas de segmentation finisher/DNF/DNS : ces données n'existent que ~24h après la course et
l'import n'existe pas encore (P1 — réutiliser le pattern Brand Voice pour un écran d'upload).

### Cross-sell (décision D)
`CampaignGenerator` propose, uniquement sur ce gate (`promoMode="siblingEvents"`), une
sélection des `SIBLING_EVENTS` (`lib/constants.ts`) à mentionner en fin de message — rien
cochée par défaut, activation laissée à l'organisateur.

---

## Création de segments personnalisés (`SegmentBuilder`)

Réduit par rapport à Sparta (voir `IRONBIKE_BRIEF.md` §4.1ter) :

1. **Nom**
2. **Scope** — pills des segments prédéfinis du gate (absent si le gate n'en a pas, ex. Gate 2)
3. **Filtres manuels** — les 7 champs réels (`gender`, `age_min`, `age_max`, `nationality`,
   `geoZone`, `hasEmail`, `registrationStatus2026`)
4. **Objectif & contexte** — texte libre injecté dans le prompt
5. **Compteur** — vrai compte via `POST /api/participants/count`, pas de mise à l'échelle

Pas de section NL ("décrire en langage naturel") ni "objectif métier" — supprimées, voir
`AI_PROMPTS.md`.

## Statistiques (`SegmentStatsDrawer`)

Récupère un objet `ParticipantStats` via `POST /api/participants/stats` (jamais les
participants eux-mêmes). Affiche : total, % joignable email, % statut 2026, répartition
`geoZone`, nationalités, âge/genre.

---

## Règles communes

1. **Segments custom = mémoire React uniquement** — disparaissent au rechargement.
2. **Chiffres = vrais comptes** — jamais de constante `SEGMENT_SIZES` ni de scaling.
3. **Aucune donnée participant côté client** — tout accès passe par `app/api/participants/*`.
