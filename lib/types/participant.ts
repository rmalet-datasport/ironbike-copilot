// GeoZone est un bucket approximatif par préfixe NPA (2 premiers chiffres), pas une distance
// calculée — voir IRONBIKE_BRIEF.md §2.2. P1 : remplacer par un vrai géocodage PLZ → Einsiedeln.
export type GeoZone =
  | 'kernradius'      // ~45 min d'Einsiedeln
  | 'innerschweiz'    // Luzern et environs
  | 'reste_suisse'
  | 'etranger'
  | 'unknown';

export type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | 'unknown';
  birthDate?: string; // ISO yyyy-mm-dd
  age?: number;
  nationality: string; // code IOC brut (SUI, GER, ITA, ... ou 'unknown')
  email?: string;
  hasEmail: boolean;
  zip?: string;
  town?: string;
  geoZone: GeoZone;

  // Vrai pour 100% du dataset : c'est un export de participants historiques.
  hasParticipatedBefore: true;

  // Inconnu par défaut pour tout le monde — ne devient 'registered'/'not_registered' que
  // via mergeRegistrationStatus() une fois une liste d'inscrits 2026 chargée. Ne jamais
  // traiter 'unknown' comme équivalent à 'not_registered' dans l'UI ou les prompts.
  registrationStatus2026: 'registered' | 'not_registered' | 'unknown';
  raceResult2026?: 'finisher' | 'dnf' | 'dns';
};
