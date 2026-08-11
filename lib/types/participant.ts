// GeoZone est un bucket approximatif par préfixe NPA (2 premiers chiffres), pas une distance
// calculée — voir IRONBIKE_BRIEF.md §2.2. P1 : remplacer par un vrai géocodage PLZ → Einsiedeln.
export type GeoZone =
  | 'kernradius'      // ~45 min d'Einsiedeln
  | 'innerschweiz'    // Luzern et environs
  | 'reste_suisse'
  | 'etranger'
  | 'unknown';

// Origine de la ligne : 'iron_bike_history' = a déjà couru l'Iron Bike (data/participants.csv),
// 'mtb_prospect' = jamais couru l'Iron Bike mais a fait au moins une autre course MTB Datasport
// ces 5 dernières années (data/mtb_myds_users_export_*.xlsx). Deux sources distinctes fusionnées
// dans un seul pool interrogeable — voir lib/db/prospects.ts pour le detail du nettoyage
// (dédoublonnage email contre les deux fichiers Iron Bike, filtre consentement newsletter).
export type ParticipantSource = 'iron_bike_history' | 'mtb_prospect';

// Historique MTB réel (hors Iron Bike), uniquement pour source='mtb_prospect' — jamais fabriqué,
// dérivé des lignes édition de l'export myDS. Sert à contextualiser l'IA ("a déjà couru le Black
// Forest ULTRA Bike Marathon"), pas à faire croire que ce sont des novices du vélo.
export interface MtbHistory {
  editionCount: number;
  lastYear: number;
  lastRace: string; // "<edition> — <contest_distanz>" de la ligne la plus récente
}

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

  source: ParticipantSource;

  // True uniquement pour source='iron_bike_history' : a déjà couru l'Iron Bike. False pour les
  // prospects MTB (jamais couru l'Iron Bike spécifiquement, voir mtbHistory pour leur historique
  // MTB réel ailleurs).
  hasParticipatedBefore: boolean;
  mtbHistory?: MtbHistory;

  // Inconnu par défaut pour tout le monde — ne devient 'registered'/'not_registered' que
  // via mergeRegistrationStatus() une fois une liste d'inscrits 2026 chargée. Ne jamais
  // traiter 'unknown' comme équivalent à 'not_registered' dans l'UI ou les prompts.
  registrationStatus2026: 'registered' | 'not_registered' | 'unknown';
  raceResult2026?: 'finisher' | 'dnf' | 'dns';
};
