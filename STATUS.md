# Iron Bike Co-Pilot — État du projet

## Comment lancer le projet

```bash
npm run dev
# → http://localhost:3000
```

---

## Ce qui fonctionne

- Navigation entre les 4 gates (Gate 0 → 3)
- Sidebar, topbar, segments avec chiffres UI
- Sélection des channels par segment
- Appel API Claude (`POST /api/ai`) — retourne HTTP 200
- Repo GitHub : à mettre à jour lors de la migration vers le repo Datasport

## Ce qui reste à régler

### 🔴 Bloquant — Génération IA : erreur front-end
L'API retourne 200 mais le composant affiche une erreur. Cause probable : la réponse JSON de Claude est mal parsée côté client.

**Fichiers à regarder :**
- `app/api/ai/route.ts` — route API (non-streaming depuis la dernière modif)
- `components/campaign/CampaignGenerator.tsx` ligne 86 — `JSON.parse(text)`

**Piste :** Ajouter un `console.log(text)` avant le `JSON.parse` pour voir la réponse brute de Claude.

### 🟡 À tester une fois la génération qui marche

- **Gate 2 — Lottery** : vérifier que les segments s'affichent et que la génération fonctionne
- **Gate 3 — Race Finish** : idem
- **Gate 0 — Event Creation** : idem
- **Régénération d'un channel seul** : fonctionnalité clé démo — cliquer "Regenerate" sur un asset individuel sans toucher les autres
- **Parcours complet** : Gate 1 → sélectionner segment → choisir channels → générer → approuver

### 🟢 Pas bloquant

### Fonts Saans manquantes
Les fichiers `.woff2` ne sont pas dans le repo (propriétaires Datasport).
Fallback automatique sur Segoe UI — visuellement acceptable pour la démo.
Pour les avoir : demander à l'équipe design.

---

## Stack & config

- Next.js 15.5.19 — App Router
- Node.js 24.x (fonctionne malgré la version récente)
- Anthropic SDK 0.105.0
- API key dans `.env.local` (non commité)
- Tailwind CSS 4
