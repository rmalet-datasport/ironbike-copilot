# IRONBIKE_BRIEF.md — Adapter Sparta Co-Pilot pour l'Iron Bike Race Einsiedeln 2026

Ce document est un brief de développement à donner à Claude Code, à lire en complément de
(pas en remplacement de) `CLAUDE.md`, `BRIEF.md`, `docs/DATA_MODEL.md`, `docs/GATES.md` et
`docs/AI_PROMPTS.md` existants. Il documente ce qui change pour réutiliser l'outil construit
pour le Copenhagen Marathon (Sparta) sur un client et un événement complètement différents :
l'Iron Bike Race Einsiedeln 2026 (BikeSide, 30ᵉ et dernière édition).

**Contrainte de calendrier : la campagne démarre demain (5.8.2026). Ce brief est scopé pour
livrer un outil fonctionnel pour demain, pas pour une réécriture complète.** Chaque section
indique un niveau de priorité : **P0** (bloquant, à faire maintenant) ou **P1** (amélioration,
peut suivre après le lancement).

---

## 0. Fork obligatoire — ne pas toucher au repo Sparta

**Aucune des modifications de ce brief ne doit être faite dans `sparta-copilot-poc`.** Ce repo
reste tel quel — il continue de servir de démo/référence pour le Copenhagen Marathon et doit
rester déployable indépendamment (autre client potentiel, autre pitch).

Étape 0, avant toute autre action de Claude Code :

1. Dupliquer le repo vers un nouveau repo dédié (ex. `datasport-ai/ironbike-copilot`) — fork
   GitHub classique ou clone + nouveau remote, au choix de l'équipe technique.
2. Toutes les modifications décrites dans ce brief (§1 à §7) s'appliquent **exclusivement** au
   nouveau repo `ironbike-copilot`.
3. Le déploiement (env de prod/démo) pour Iron Bike pointe vers ce nouveau repo, pas vers celui
   de Sparta — deux apps déployées séparément, deux `.env.local` séparés (même
   `ANTHROPIC_API_KEY` si partagée, mais fichiers distincts).
4. Aucun lien de dépendance entre les deux repos après le fork — pas de package partagé, pas
   d'import croisé. Une divergence complète est voulue ici, pas une architecture multi-tenant
   (ça, ce sera le sujet du **P1 "EVENT_CONFIG multi-événement"** §7 — et si ça se fait un jour,
   ce sera probablement l'inverse : re-fusionner les deux repos dans un seul outil configurable,
   pas maintenir le fork indéfiniment).

Cette contrainte ne change rien au reste du brief — juste le nom du repo cible dans toutes les
références de fichiers ci-dessous (`lib/constants.ts` etc. désignent désormais des fichiers dans
`ironbike-copilot`, pas dans `sparta-copilot-poc`).

---

## 0bis. Ce qui ne change pas (dans le nouveau repo)

L'architecture globale reste celle du POC Sparta : 4 gates représentant les phases du lifecycle,
segments prédéfinis + segments personnalisés (SegmentBuilder), génération de campagne via l'API
Claude avec des system prompts par gate/segment, Brand Voice (upload d'exemples passés),
historique de campagnes sauvegardées. On ne réécrit pas ces mécaniques, on les reconfigure.

---

## 1. ⚠️ Point critique — données réelles, pas une démo

Contrairement à Sparta (500 athletes fictifs générés selon une distribution voulue), **la donnée
Iron Bike fournie est réelle et sera utilisée en production** : un export `History.csv` de
18 607 personnes s'étant déjà inscrites à l'Iron Bike Race, toutes éditions confondues.

Colonnes réelles disponibles : `firstName, lastName, gender, birthDate, nationIOC, email, zip,
town, Status` (la colonne `Status` est vide sur les 18 607 lignes — à ignorer/supprimer).

Ce que cette donnée **ne contient pas**, contrairement au modèle Sparta : combien de fois une
personne a couru, quelle(s) année(s), quelle distance, quel temps, si elle est **inscrite pour
l'édition 2026**, et son statut de résultat à venir (finisher / DNF / DNS). Le propriétaire des
données confirme lui-même ne pas encore avoir de solution pour obtenir la liste des inscrits 2026.

**Conséquence directe : ne fabriquer aucune de ces informations.** Pas de score d'engagement
simulé, pas de flag "inscrit 2026" aléatoire, pas de nombre d'éditions courues inventé. Le champ
`registrationStatus2026` doit rester `unknown` par défaut et être traité comme un vrai inconnu
dans toute l'UI et tous les prompts — jamais comme `false`. La suppression réelle des déjà-inscrits
avant un envoi se fera hors-outil (export onreg), comme prévu dans le concept de campagne
lui-même (chapitre 4, étape 4 : "Suppression").

### 1.1 Confidentialité — **P0, à traiter avant tout commit**

Le POC Sparta bundlait sa DB fictive (`lib/db/athletes.ts`, 500 entrées) comme un tableau
TypeScript littéral, importé directement dans des composants client. **Ne pas reproduire ce
pattern avec les 18 607 vraies personnes** (nom, email, date de naissance) — ça les expédierait
dans le bundle JS servi au navigateur, lisibles par n'importe qui via les devtools.

À faire :

- Le fichier brut (`History.csv` ou sa version nettoyée) ne doit **jamais être commité** dans
  git. L'ajouter à `.gitignore`. Le charger depuis un chemin local non versionné (ex: `data/`)
  ou une variable d'env pointant vers un stockage privé.
- Le parsing/filtrage des participants doit se faire **côté serveur** (route API ou fonction
  serveur Next.js), qui ne renvoie au client que des agrégats (compteurs, stats) ou des listes
  déjà filtrées et limitées (échantillon d'affichage), jamais le dataset complet.
- La base juridique de consentement marketing sur ce fichier n'est pas tranchée (le concept de
  campagne le signale lui-même, chapitre 4 : une participation passée n'est pas un consentement
  marketing). Ce n'est pas un blocage technique mais **il faut le signaler à ton boss** — ce
  n'est pas à Claude Code de trancher.

### 1.2 Qualité des données — **P0**

À nettoyer lors du parsing (script one-off ou fonction de chargement) :

- ~28 lignes de bruit évident (ex: `firstName="Bbb", lastName="Aaa"`, ou un numéro de référence
  du type `Refnr=29168` qui a fuité dans le champ prénom) — à exclure.
- `gender` vide sur 42 lignes → traiter comme `'unknown'`, ne pas forcer M/F.
- `birthDate` absent sur ~1,1% des lignes (200 lignes) → âge `undefined`, ne pas estimer.
- Doublons : 839 emails apparaissent plus d'une fois sur 12 249 emails uniques (familles
  partageant un email, ou doublons de saisie) — dédupliquer par email n'est pas fiable à 100%,
  documenter le choix (garder la première occurrence, ou dédupliquer par email + nom + date de
  naissance combinés).

### 1.3 Statistiques réelles observées (pour calibrer les segments et les seuils)

| Champ                           | Valeur                           |
| ------------------------------- | -------------------------------- |
| Total lignes                    | 18 607                           |
| Avec email                      | 13 410 (72,1%)                   |
| Avec zip                        | 18 519 (99,5%)                   |
| Avec date de naissance          | 18 407 (98,9%)                   |
| Nationalité Suisse (SUI)        | 16 963 (91,2%)                   |
| Genre                           | 84,2% M / 15,6% F / 0,2% inconnu |
| Âge (p25 / médiane / p75 / p90) | 43 / 53 / 60 / 66                |

L'âge médian (53 ans) tombe bien dans la cible 38–60 ans du concept campagne (chapitre 3) — pas
besoin d'ajuster le ciblage démographique, la base existante est déjà la bonne audience.

---

## 2. Modèle de données — `lib/types/participant.ts` (remplace `athlete.ts`)

Renommer `Athlete` en `Participant` (le mot "athlete" collait au marathon ; "participant"
convient mieux ici, et évite toute confusion résiduelle avec le modèle Sparta pendant la review).

```ts
export type GeoZone =
  | "kernradius" // ~45 min d'Einsiedeln — voir table de correspondance §2.2
  | "innerschweiz" // zweitcluster (Luzern et environs)
  | "reste_suisse"
  | "etranger"
  | "unknown";

export type Participant = {
  id: string; // hash stable généré au parsing (pas de Refnr fiable)
  firstName: string;
  lastName: string;
  gender: "M" | "F" | "unknown";
  birthDate?: string; // ISO, dérivé du format DD.MM.YYYY source
  age?: number; // dérivé, undefined si birthDate absent
  nationality: string; // code IOC brut (SUI, GER, ITA, ...)
  email?: string;
  hasEmail: boolean; // dérivé — utilisé pour le filtre "reachable"
  zip?: string;
  town?: string;
  geoZone: GeoZone; // dérivé, voir §2.2

  // Ce qu'on SAIT : cette personne a participé au moins une fois, un jour, à l'Iron Bike.
  hasParticipatedBefore: true;

  // Ce qu'on NE SAIT PAS ENCORE — mais champ filtrable dès maintenant (voir §4.1bis) :
  // par défaut tout le monde est 'unknown' ; se peuple réellement dès qu'un import
  // "inscrits 2026" est chargé (matching par email, voir §4.1bis).
  registrationStatus2026: "registered" | "not_registered" | "unknown";
  raceResult2026?: "finisher" | "dnf" | "dns"; // rempli seulement après import post-course
};
```

### 2.1 Ce qu'on abandonne du modèle Sparta

Tous les champs suivants n'ont **aucune source de données réelle** pour Iron Bike aujourd'hui et
ne doivent pas être recréés : `engagement` (score composite, taux d'ouverture email, etc.),
`totalEditionsApplied/Raced`, `isReturningAthlete` (remplacé par le fait que 100% du dataset a
déjà participé), `candidacyScore`, `anticipatedValue`, `selectionProbability`,
`preLotterySegment`/`postLotterySegment`/`postRaceSegment` (tout le vocabulaire "lottery"
disparaît, voir §4), `upsellsPurchased`, `personalBest`, `reRegistrationProbability`.

### 2.2 Dérivation de `geoZone` — **P0 approximatif, P1 précis**

Le concept de campagne est explicite (chapitre 4) : _"Nicht raten, rechnen"_ — ne pas deviner, calculer.
Idéalement `geoZone` se calcule via une vraie distance PLZ → Einsiedeln (table de géocodage des
NPA suisses, ex. jeu de données swisstopo/opendata.swiss). **P1 : implémenter ce calcul propre.**

**P0, pour demain**, un bucket par préfixe NPA (2 premiers chiffres) donne déjà un signal solide
et directement vérifié sur les 16 963 entrées suisses du fichier réel :

| Préfixe NPA           | Zone approx.                           | Nb dans le fichier | Bucket         |
| --------------------- | -------------------------------------- | ------------------ | -------------- |
| 64xx                  | Schwyz / Einsiedeln                    | 993                | `kernradius`   |
| 88xx                  | Zimmerberg / Pfäffikon SZ / Wädenswil  | 3 903              | `kernradius`   |
| 87xx                  | Meilen / Küsnacht (rive gauche du lac) | 698                | `kernradius`   |
| 86xx                  | Zürich Oberland / Rapperswil / Uster   | 853                | `kernradius`   |
| 63xx                  | Zoug                                   | 962                | `kernradius`   |
| 80xx / 81xx           | Ville de Zurich                        | 1 351              | `kernradius`   |
| 60xx                  | Lucerne                                | 552                | `innerschweiz` |
| tout autre préfixe CH | —                                      | ~7 651             | `reste_suisse` |
| `nationIOC !== 'SUI'` | —                                      | 1 644 (8,8%)       | `etranger`     |

→ Avec ce bucket grossier, **~51,6% des entrées suisses tombent déjà dans `kernradius`**, ce qui
confirme l'hypothèse du concept de campagne (le cœur de la base est bien dans le rayon de 45 min).
Documenter clairement dans le code que ce bucket est une approximation par préfixe, pas une
vraie distance calculée — pour que personne ne s'appuie dessus comme si c'était fiable au NPA près.

---

## 3. `lib/constants.ts` — remplacer `EVENT`, `SEGMENT_SIZES`, `RACES`

**Approche P0 validée : hardcoder directement les valeurs Iron Bike** (pas d'abstraction
multi-événement pour l'instant — à faire plus tard si d'autres clients suivent).

```ts
export const EVENT = {
  name: "Iron Bike Race Einsiedeln",
  edition: 30, // 30ᵉ et DERNIÈRE édition
  isLastEdition: true,
  raceDate: "2026-09-27",
  eventWeekend: { start: "2026-09-25", end: "2026-09-27" },
  city: "Einsiedeln",
  country: "Switzerland",
  registrationUrl: "https://onreg.datasport.com/de/iron-bike-race-2026",
  campaignStartDate: "2026-08-05",
  mutationDeadline: "2026-09-20",
  campaignEndDate: "2026-09-30", // newsletter 6 + closing post
};

export const CATEGORIES = [
  {
    id: "long",
    label: "Iron Bike Race lang",
    distanceKm: 83,
    elevationM: 3130,
  },
  { id: "medium", label: "Iron Bike Race mittel", distanceKm: 49 },
  {
    id: "short",
    label: "Iron Bike Race kurz",
    distanceKm: 32,
    elevationM: 1250,
  },
  {
    id: "vintage",
    label: "Vintage Race",
    distanceKm: 32,
    note: "26 Zoll, eigene Wertung",
  },
  { id: "easy_ride", label: "Easy Ride", distanceKm: 26 },
  { id: "e_mtb", label: "E-MTB Joy Ride" },
  { id: "kids", label: "Kids Race", minAge: 7 },
];

// Autres courses Bike Marathon Classics — pour le cross-sell Gate 3 (décision D du concept)
export const SIBLING_EVENTS = [
  { id: "jura_bike", name: "Jura Bike Marathon" },
  { id: "raid_evolenard", name: "Raid Evolénard" },
  { id: "nationalpark_bike", name: "Nationalpark Bike Marathon" },
  { id: "eiger_bike", name: "Eiger Bike Challenge" },
  { id: "grand_raid_bcvs", name: "Grand Raid BCVS" },
];
```

`SEGMENT_SIZES` disparaît en tant que constantes inventées : les tailles de segment doivent être
**comptées en vrai** depuis le dataset réel (côté serveur), pas hardcodées comme chez Sparta où
les chiffres UI étaient déconnectés de la DB statique. C'est un changement de philosophie
important — signalé en gras parce que `CLAUDE.md` actuel dit explicitement l'inverse
("Les chiffres UI... proviennent de `lib/constants.ts`, PAS du comptage de la DB").

Le champ `RACES` (sélecteur cross-sell dans `CampaignGenerator`) devient le sélecteur de
`CATEGORIES` ci-dessus (utile côté Gate 0/1 pour choisir quelle(s) catégorie(s) promouvoir dans un
post) — et `SIBLING_EVENTS` alimente un nouveau sélecteur pour Gate 3 uniquement (cross-sell
post-course).

---

## 4. Les 4 gates — nouvelle définition (vérifiée contre le calendrier du Word)

Il n'y a pas de tirage au sort pour Iron Bike (inscription ouverte, premier arrivé). Tout le
vocabulaire "lottery/ballot/waitlist/refused" disparaît. En croisant le calendrier détaillé du
concept de campagne (16 posts Feed, 30 items Stories, 6 newsletters, 3 vagues Meta), les 4 gates
deviennent des **phases temporelles de la campagne** plutôt que des étapes d'un tirage au sort :

| Gate (route existante)       | Nouveau nom                              | Période            | Contenu du concept couvert                                                                                                                                           |
| ---------------------------- | ---------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gate/creation` (Gate 0)     | **Ankündigung** (Lancement)              | Mi 5.8 – Ve 7.8    | Post 1 (annonce), Newsletter 1 (à tous), communiqué de presse, Post 2 (appel à photos)                                                                               |
| `gate/registration` (Gate 1) | **Anmeldephase** (Inscriptions ouvertes) | Ve 7.8 – Di 20.9   | Posts 3–12, Newsletter 2 (réactivation — **la plus importante**), Newsletter 3, Newsletter 4, lancement countdown Stories (29.8), vagues Meta awareness + conversion |
| `gate/lottery` (Gate 2)      | **Race Week** (Dernière ligne droite)    | Me 16.9 – Ve 25.9  | Posts 13–16, Newsletter 5 (logistique inscrits), countdown items 21–30 (bascule sérieuse dès l'item 27), vague Meta retargeting                                      |
| `gate/finish` (Gate 3)       | **Renntag & danach** (Course & après)    | Sa 26.9 – Me 30.9+ | Stories live jour J, post du soir avec les vainqueurs, Newsletter 6, post de clôture, cross-sell vers les autres Bike Marathon Classics                              |

**P1** : renommer les dossiers de route (`gate/announcement`, `gate/open-registration`,
`gate/race-week`, `gate/post-race`) pour que l'URL reflète le nouveau sens. **P0** : garder les
routes existantes, changer seulement les labels affichés — moins de risque de casser des liens/
tests à la veille du lancement.

### 4.1 Segments par gate — basés uniquement sur des champs réels

Contrairement à Sparta, on ne peut plus définir un segment par un champ de statut dédié
(`postLotterySegment`, etc.) puisque ce champ n'existe pas. Chaque segment ci-dessous se
recalcule à la volée à partir de `Participant` (geoZone, age, gender, hasEmail, nationality).

**Ankündigung (Gate 0)** — pas de segmentation fine : Newsletter 1 et Post 1 s'adressent
"à tous" selon le concept. Un seul segment agrégé : `toute_la_base` (18 607 personnes, dont
72,1% joignables par email). Pas de bouton de segmentation avancée nécessaire ici — ou alors
juste à titre informatif (répartition géo/âge affichée, sans en faire un vrai filtre d'envoi).

**Anmeldephase (Gate 1)** — c'est le gate le plus riche, celui qui porte Newsletter 2 (le levier
le plus important selon le concept) :

| Segment                        | Définition (champs réels)                                       | Taille estimée                                                 |
| ------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------- |
| `reactivation_kernradius`      | `hasEmail && geoZone === 'kernradius'`                          | ~51,6% des 13 410 joignables ≈ 6 900                           |
| `reactivation_hors_kernradius` | `hasEmail && geoZone !== 'kernradius' && nationality === 'SUI'` | reste des joignables CH                                        |
| `reactivation_etranger`        | `hasEmail && nationality !== 'SUI'`                             | ~8,8% des joignables ≈ 1 180                                   |
| `non_joignable_email`          | `!hasEmail`                                                     | 27,9% (5 197) — courrier postal ou exclu, à décider hors-outil |

⚠️ **Chaque segment ci-dessus contient potentiellement des gens déjà inscrits en 2026** — c'est
le trou de données documenté en §1. Le prompt et l'UI doivent porter ce caveat explicitement
(bannière : _"Statut d'inscription 2026 inconnu pour cette base — à exclure manuellement via
l'export onreg avant tout envoi réel"_), pas le cacher.

### 4.1bis Filtre `registrationStatus2026` — à construire dès maintenant, même sans données

Décision : ce champ doit exister comme **filtre réel dans l'UI dès la livraison de demain**
(valeurs Registered / Not registered / Unknown), même si tout le dataset est en `unknown`
aujourd'hui. Objectif : le jour où la liste des inscrits 2026 arrive (ton boss la cherche
activement), le filtre fonctionne immédiatement, sans redéploiement ni nouveau brief.

Prévoir dès maintenant (**P0, plomberie légère** — pas besoin d'avoir le fichier en main) :

- Le champ dans `Participant` et dans `FilterField` (segment-filter.ts) comme un vrai champ
  filtrable, au même titre que `age`/`gender`/`geoZone`.
- Une fonction serveur `mergeRegistrationStatus(participants, registeredList)` qui matche par
  email en priorité (le champ le plus fiable des deux côtés), avec repli sur
  nom + date de naissance si l'email est absent ou ne matche pas. Documenter le taux de match
  attendu (ne sera jamais 100% — noms mal orthographiés, emails changés).
- Un point d'entrée pour charger cette liste **(P1 pour l'implémentation de l'écran d'upload,
  mais la fonction de merge ci-dessus doit exister dès P0)** — réutiliser le pattern d'upload
  déjà présent pour Brand Voice (`lib/context/BrandHistoryContext.tsx`, `.xlsx`/`.csv`).
- Tant qu'aucune liste n'est chargée : filtrer sur "Registered" renvoie 0 résultat, avec un
  message explicite dans l'UI ("Aucune donnée d'inscription 2026 chargée pour l'instant"),
  jamais un silence qui laisserait croire que le filtre a réellement tranché.

### 4.1ter Segmentation — pas de découverte IA, filtres manuels uniquement

Avec seulement 5-6 champs réellement filtrables (âge, genre, nationalité, geoZone, hasEmail,
et maintenant registrationStatus2026), les deux mécanismes IA de découverte de segments de
Sparta n'apportent rien ici et risquent même de nuire à la crédibilité de l'outil :

- **`analyze-gate` / le widget "Découvrir des sous-segments" (`AISubSegments.tsx`)** — avec si
  peu de dimensions, l'IA ne peut que recombiner les mêmes 2-3 filtres sous un nom différent.
  **À supprimer entièrement** : composant + route API.
- **`suggest-segment` (objectif métier → portrait + insights)** — le bloc "insights sur les
  critères non filtrables" tournerait en pratique à "on n'a pas cette donnée", ce qui sonne
  creux répété à chaque utilisation. **À supprimer entièrement** : route API + sections 2 et 3
  du `SegmentBuilder`.
- **`parse-segment` (langage naturel → filtres)** — recommandé de le supprimer aussi par
  cohérence : avec 5-6 champs, cliquer 2-3 menus déroulants est plus rapide qu'écrire une
  phrase et attendre un aller-retour API. Facile à réintroduire plus tard si l'usage montre
  un vrai besoin — ne pas le garder "juste au cas où" pour l'instant.

`SegmentBuilder` se réduit donc à : Nom → Scope (segments prédéfinis du gate) → Filtres manuels
(les champs réels, dont `registrationStatus2026`) → Objectif/contexte libre → Compteur. Plus
simple, plus honnête sur ce que l'outil sait vraiment, et moins de code à livrer pour demain.

**Mise à jour (11.8.2026)** : le segment "nouveaux prospects jamais inscrits" (ciblage géo,
chapitre 4 étapes 1–3 du concept) — documenté ci-dessus comme absent car vivant uniquement dans
Meta Ads Manager (Custom Audience/Lookalike) — a depuis été comblé par un vrai export myDS
(`data/mtb_myds_users_export_2026_08_07_1616.xlsx`, ~57 837 comptes ayant fait au moins une
course MTB Datasport hors Iron Bike ces 5 ans). Voir `docs/DATA_MODEL.md` "Deuxième source :
prospects MTB" pour le détail complet : consentement newsletter réel, dédoublonnage contre
`participants.csv`/la liste des inscrits 2026, ~24 400 prospects mailables au final, exposés via
`source='mtb_prospect'` et les segments `prospects_mtb_kernradius/hors_kernradius/etranger` sur
Gate 1 (voir `GATES.md`). Limite documentée : matching de dédoublonnage par email uniquement
(l'export MTB n'a ni nom de famille ni date de naissance), et heuristique NPA approximative pour
`geoZone` en l'absence de nationalité dans cette source — les deux mêmes limites déjà acceptées
ailleurs dans ce brief pour `participants.csv`.

**Race Week (Gate 2)** — Newsletter 5 s'adresse "aux inscrits" (`an Angemeldete`), une donnée
qu'on n'a pas non plus. Deux options réalistes, à trancher avec ton équipe :

- soit le contenu Newsletter 5 est généré ici mais **envoyé via une liste extraite directement
  d'onreg**, pas via ce dataset (recommandé) ;
- soit on garde un segment `toute_la_base` générique pour prévisualiser un brouillon.
  Pour le dernier appel (post 14, "Letzter Aufruf") aux non-inscrits : mêmes segments géo que
  Gate 1, avec un prompt à tonalité d'urgence (voir §5).

**Renntag & danach (Gate 3)** — même limite : on ne connaît pas les finishers/DNF/DNS tant que
les résultats de course ne sont pas importés (disponibles ~24h après le 27.9, comme chez Sparta
Gate 3, mais l'import n'existe pas encore ici). Pour l'instant : un segment unique
`toute_la_base` pour Newsletter 6 (remerciement) + un module de sélection des `SIBLING_EVENTS` à
inclure dans le post-scriptum cross-sell (décision D du concept — recommandée par le concept,
mais confirmée à activer/désactiver par ton équipe).

**P1** : ajouter un écran d'import CSV pour les résultats de course une fois disponibles (réutiliser
le pattern d'upload déjà présent pour Brand Voice, `lib/context/BrandHistoryContext.tsx`), afin que
Gate 3 puisse se resegmenter automatiquement une fois les résultats connus, sans redéploiement.

---

## 5. Prompts — réécriture en allemand, ton du concept de campagne

**Décision validée : générer en allemand (suisse-allemand), pas en anglais.**

### 5.1 Prompt de base (remplace le prompt de base anglais de `docs/AI_PROMPTS.md`)

```
Du bist der BikeSide Co-Pilot von Datasport. Du erstellst Marketinginhalte für das
Iron Bike Race Einsiedeln — die 30. und letzte Austragung, am 27. September 2026.

Zielgruppe: 38–60 Jahre, mehrheitlich männlich (84%), Wiederholungstäter — Leute, die
dieses Rennen schon einmal gefahren sind und ihre eigene Geschichte damit haben.

Tonalität — strikt einhalten:
- Trocken, selbstironisch, konkret. Zahlen statt Adjektive.
- Insiderwitze über Schlamm, kaputte Schaltungen, Kettenblätter aus den Neunzigern.
- Du-Form. Kurze Sätze.
- Verboten: Trauerrhetorik, Superlative, "einzigartiges Erlebnis", Emoji-Ketten,
  generische Stockfotos, jede Rechtfertigung dafür, warum Schluss ist.
- Maximal ein Emoji pro Text, und nur wenn es inhaltlich etwas tut.
- Ausnahme Race Week / T-3 bis T-0: Tonwechsel erlaubt — ernst, ohne Pointe, kein Witz mehr.

Antworte NUR mit gültigem JSON, ohne Markdown, ohne Backticks.
```

### 5.2 Nuance par gate (à décliner en system prompt complet par gate, sur le modèle

`docs/AI_PROMPTS.md` existant — ne pas les écrire ici en entier, juste le ton attendu) :

- **Ankündigung** : direct, factuel, presque brutal ("Nach 30 Jahren ist Schluss"). Pas
  d'emphase émotionnelle, les chiffres portent le message.
- **Anmeldephase / réactivation** : le segment le plus important — personnalisation si possible
  (prénom, mention qu'iels ont déjà participé), ton nostalgique-mais-sec, jamais larmoyant.
- **Race Week** : logistique claire pour les inscrits (dossards, météo, accès) ; urgence sobre
  pour les non-inscrits ("il n'y a pas d'année prochaine").
- **Renntag & danach** : bascule sérieuse assumée — remerciement sincère, pas de pointe, cross-
  sell discret vers les autres courses en deux lignes maximum, sans y consacrer le corps du texte.

### 5.3 Types de contenu — le modèle Sparta ne correspond pas

Sparta génère 4 assets uniformes par channel (`email/sms/push/instagram`, même forme
`{subject, body, caption, hashtags}` pour tous). Le concept Iron Bike attend des formats
structurellement différents :

| Nouveau channel  | Champs de l'asset                                                                   | Remplace                                        |
| ---------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| `feed_post`      | `copy`, `cta`, `visualDirection` (typo / photo / illustration IA — voir chapitre 6) | `instagram`                                     |
| `story`          | `editionNumber`, `dataPoint`, `sentence`, `stickerLink?` (absent items 28–30)       | — nouveau                                       |
| `newsletter`     | `subject`, `preheader`, `body`, `personalizationFields?`                            | `email`                                         |
| `paid_ad` _(P1)_ | `headline`, `primaryText`, `audienceNote`                                           | `sms`, `push` (supprimés — pas dans le concept) |

**P0** : au minimum `feed_post` + `story` + `newsletter` (99% du volume de contenu du concept).
**P1** : `paid_ad`. `sms` et `push` n'ont aucun usage dans le concept Iron Bike — à retirer du
`ChannelSelector`, pas juste à laisser inactifs.

Ce changement de forme d'asset touche `components/campaign/AssetCard.tsx` (actuellement câblé
sur les champs Sparta), `CampaignGenerator.tsx`, et le contrat JSON retourné par
`app/api/ai/route.ts` — **c'est le morceau de code le plus invasif de toute cette migration**,
prévoir le plus de temps dessus.

---

## 6. Résumé des fichiers à modifier

| Fichier                                                                                                                                                                | Nature du changement                                                                                | Priorité           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------ |
| `.gitignore`                                                                                                                                                           | ajouter le fichier de données participants réelles                                                  | **P0**             |
| `lib/types/participant.ts` (nouveau, remplace `athlete.ts`)                                                                                                            | nouveau modèle réduit + `registrationStatus2026`, voir §2                                           | P0                 |
| `lib/db/participants.ts` (nouveau, remplace `athletes.ts`)                                                                                                             | parsing/nettoyage CSV réel, côté serveur, + fonction `mergeRegistrationStatus` (§4.1bis)            | P0                 |
| `lib/db/segment-filter.ts`                                                                                                                                             | filtres géo/âge/genre/email/registrationStatus2026 au lieu des champs lottery                       | P0                 |
| `lib/db/segment-stats.ts`                                                                                                                                              | stats recalculées sur les nouveaux champs                                                           | P0                 |
| `lib/constants.ts`                                                                                                                                                     | `EVENT`, `CATEGORIES`, `SIBLING_EVENTS` — voir §3                                                   | P0                 |
| `lib/ai/prompts.ts`                                                                                                                                                    | prompts allemands, nouveaux gates/segments — voir §5                                                | P0                 |
| `lib/types/gates.ts`                                                                                                                                                   | types par gate mis à jour aux nouveaux champs                                                       | P0                 |
| `components/gates/SegmentBuilder.tsx`                                                                                                                                  | supprimer sections 2 & 3 (NL/objectif IA), garder nom/scope/filtres manuels/compteur — voir §4.1ter | P0                 |
| `components/campaign/AssetCard.tsx`                                                                                                                                    | nouveaux champs par channel — voir §5.3                                                             | P0 (le plus lourd) |
| `components/campaign/CampaignGenerator.tsx`                                                                                                                            | channels dispo, cross-sell Gate 3                                                                   | P0                 |
| `components/gates/ChannelSelector.tsx`                                                                                                                                 | retirer sms/push, ajouter feed_post/story/paid_ad                                                   | P0                 |
| `app/api/ai/route.ts`                                                                                                                                                  | contrat JSON par channel mis à jour                                                                 | P0                 |
| `app/gate/*/page.tsx` (4 fichiers)                                                                                                                                     | labels, segments, bannière caveat données                                                           | P0                 |
| `docs/DATA_MODEL.md`, `docs/GATES.md`, `docs/AI_PROMPTS.md`, `CLAUDE.md`                                                                                               | mettre à jour la doc (comme pour Sparta, sert de référence à Claude Code)                           | P0                 |
| **à supprimer** : `components/gates/AISubSegments.tsx`, `app/api/ai/analyze-gate/route.ts`, `app/api/ai/suggest-segment/route.ts`, `app/api/ai/parse-segment/route.ts` | plus de valeur avec si peu de champs — voir §4.1ter                                                 | P0 (suppression)   |
| Écran d'import CSV réutilisable (Brand Voice pattern) pour registered-2026 / résultats course                                                                          | nouveau — la fonction de merge existe dès P0, l'écran d'upload peut suivre                          | **P1**             |
| `EVENT_CONFIG` multi-événement                                                                                                                                         | abstraction                                                                                         | **P1**             |
| Renommage des routes gate                                                                                                                                              | cosmétique                                                                                          | **P1**             |
| Géocodage NPA précis (remplace le bucket par préfixe)                                                                                                                  | précision                                                                                           | **P1**             |
| Génération `paid_ad`                                                                                                                                                   | contenu additionnel                                                                                 | **P1**             |

---

## 7bis. Exécution — en local par chacun, pas de déploiement serveur pour demain

**Décision (vu le temps disponible) : pas de déploiement sur `lab.datasport.com` pour l'instant.**
Chaque collègue fork `ironbike-copilot` et le lance en local sur sa machine
(`npm install && npm run dev`, comme documenté dans `STATUS.md`). Le pipeline Docker/Traefik/
runner self-hosted du repo Sparta (`.github/workflows/deploy.yml`, `docker-compose.prod.yml`)
n'est **pas utilisé pour l'instant** — à garder en tête comme option **P1** si l'équipe veut
plus tard un outil hébergé partagé plutôt qu'une instance par personne.

Ce que ça implique concrètement, à documenter clairement pour les collègues (pas juste pour
Claude Code) :

1. **`.env.local` par personne** — chacun a besoin de sa propre copie avec au minimum
   `ANTHROPIC_API_KEY`. Les variables `DEMO_PASSWORD`/`DEMO_COOKIE_SECRET` du gate d'accès
   (`middleware.ts`) n'ont plus vraiment d'utilité en local mono-utilisateur — soit renseigner
   n'importe quelle valeur pour que le middleware ne bloque pas, soit **P1** simplifier en
   retirant le gate pour l'usage local (pas bloquant pour demain, juste du bruit à contourner).
2. **Distribution du fichier de données réelles** — chaque collègue doit récupérer une copie
   locale du participant data file (nettoyé, voir §1/§2). **Ne pas le committer dans le repo
   forké** (voir §1.1 — reste valable même en local, un fork GitHub reste potentiellement
   visible/cloné par d'autres). Le distribuer via un canal séparé et déjà sécurisé (le même
   endroit que d'où vient `History.csv` aujourd'hui — pas par email/Slack en clair), chacun le
   place dans son `data/` local gitignoré.
3. **Pas de persistance, et maintenant pas de serveur partagé non plus** — chaque instance
   locale est isolée : ce qu'un collègue génère n'est visible que sur sa machine, et disparaît
   au rechargement de l'onglet (segments personnalisés et historique de campagnes sont en
   mémoire React uniquement, comme documenté dans `CLAUDE.md` du repo Sparta — ce comportement
   ne change pas). **Pour un usage de vraie production** (pas une démo), le risque n'est plus
   théorique : un refresh accidentel = contenu généré perdu pour de vrai. Consigne à donner aux
   collègues : copier le texte généré vers sa destination finale (Mailchimp/outil newsletter,
   Meta Business Suite, planning de posts) immédiatement après génération, ne pas compter sur
   l'outil comme lieu de stockage. **P1** : ajouter une persistance légère (localStorage) de
   `CampaignHistoryContext` pour amortir ce risque sans dépendre d'un serveur partagé.
4. Chaque collègue étant sur son propre fork/clone, il n'y a pas de vue commune de "qui a généré
   quoi" — si une coordination d'équipe est nécessaire (éviter que deux personnes travaillent le
   même segment), ce sera à gérer hors-outil (ex: un canal Slack dédié), pas dans l'app.

---

## 7. Décisions encore ouvertes (pas à Claude Code de trancher)

- Base de consentement marketing sur `History.csv` (§1.1) — à valider avec la direction/juridique.
- Qui fournit et quand la liste des inscrits 2026 (ton boss cherche activement une solution — la
  plomberie technique pour l'exploiter dès qu'elle arrive est prête, voir §4.1bis).
- Alignement avec l'OK Iron Bike Race sur la date/formulation exacte de l'annonce d'adieu.
- Activation ou non du cross-sell vers les autres Bike Marathon Classics en fin de Newsletter 6
  (décision D du concept — recommandée mais optionnelle).

Ces points n'empêchent pas de livrer l'outil demain — ils affectent seulement le contenu final
et les vraies listes d'envoi, pas la mécanique du POC.
