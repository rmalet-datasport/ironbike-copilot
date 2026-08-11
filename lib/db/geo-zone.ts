// SERVEUR UNIQUEMENT (pas de données participant ici, mais côté serveur par convention avec le
// reste de lib/db/). Bucket approximatif par préfixe NPA (2 premiers chiffres), pas une distance
// calculée — voir IRONBIKE_BRIEF.md §2.2. Partagé par participants.ts (nationalité SUI + NPA) et
// prospects.ts (NPA brut, pas de nationalité disponible dans l'export MTB).
//
// Kernradius (~45 min en voiture d'Einsiedeln) : préfixes historiques {64,88,87,86,63,80,81},
// confirmés le 11.8.2026 contre l'isochrone "45 min en voiture" Google Maps/Gemini. Complétés le
// 11.8.2026 par une liste explicite de NPA du canton de Zurich (préfixe 89, Affoltern am
// Albis/Knonaueramt) absent des préfixes historiques mais dans le rayon de 45 min.
import type { GeoZone } from '@/lib/types/participant';

const KERNRADIUS_PREFIXES = new Set(['64', '88', '87', '86', '63', '80', '81']);

// NPA précis hors des préfixes ci-dessus mais confirmés dans l'isochrone 45 min (canton de
// Zurich, région d'Affoltern am Albis / Knonaueramt).
const EXTRA_KERNRADIUS_CODES = new Set([
  8902, 8903, 8904, 8905, 8906, 8907, 8908, 8910, 8911, 8912, 8913, 8914, 8915, 8916, 8917, 8918,
  8919, 8925, 8926, 8932, 8933, 8934, 8942,
]);

const INNERSCHWEIZ_PREFIXES = new Set(['60']);

// zip = NPA suisse (4 chiffres). N'assume rien sur la nationalité — c'est à l'appelant de
// décider si le NPA est plausiblement suisse avant d'appeler cette fonction.
export function bucketByZip(zip: string): GeoZone {
  const prefix = zip.slice(0, 2);
  if (KERNRADIUS_PREFIXES.has(prefix)) return 'kernradius';
  const npa = Number(zip);
  if (Number.isFinite(npa) && EXTRA_KERNRADIUS_CODES.has(npa)) return 'kernradius';
  if (INNERSCHWEIZ_PREFIXES.has(prefix)) return 'innerschweiz';
  return 'reste_suisse';
}
