export const EVENT = {
  name: 'Iron Bike Race Einsiedeln',
  edition: 30,
  isLastEdition: true,
  raceDate: '2026-09-27',
  eventWeekend: { start: '2026-09-25', end: '2026-09-27' },
  city: 'Einsiedeln',
  country: 'Switzerland',
  registrationUrl: 'https://onreg.datasport.com/de/iron-bike-race-2026',
  campaignStartDate: '2026-08-05',
  mutationDeadline: '2026-09-20',
  campaignEndDate: '2026-09-30',
};

export interface Category {
  id: string;
  label: string;
  distanceKm: number;
  elevationM?: number;
  minAge?: number;
  note?: string;
}

export const CATEGORIES: Category[] = [
  { id: 'long', label: 'Iron Bike Race lang', distanceKm: 83, elevationM: 3130 },
  { id: 'medium', label: 'Iron Bike Race mittel', distanceKm: 49 },
  { id: 'short', label: 'Iron Bike Race kurz', distanceKm: 32, elevationM: 1250 },
  { id: 'vintage', label: 'Vintage Race', distanceKm: 32, note: '26 Zoll, eigene Wertung' },
  { id: 'easy_ride', label: 'Easy Ride', distanceKm: 26 },
  { id: 'e_mtb', label: 'E-MTB Joy Ride', distanceKm: 0 },
  { id: 'kids', label: 'Kids Race', distanceKm: 0, minAge: 7 },
];

export interface SiblingEvent {
  id: string;
  name: string;
}

// Cross-sell Gate 3 uniquement (décision D du concept) — voir IRONBIKE_BRIEF.md §3/§4.
export const SIBLING_EVENTS: SiblingEvent[] = [
  { id: 'jura_bike', name: 'Jura Bike Marathon' },
  { id: 'raid_evolenard', name: 'Raid Evolénard' },
  { id: 'nationalpark_bike', name: 'Nationalpark Bike Marathon' },
  { id: 'eiger_bike', name: 'Eiger Bike Challenge' },
  { id: 'grand_raid_bcvs', name: 'Grand Raid BCVS' },
];

// P0 : feed_post + story + newsletter (99% du volume de contenu du concept).
// P1 : paid_ad. sms/push n'ont aucun usage dans le concept Iron Bike.
export const CHANNELS = ['feed_post', 'story', 'newsletter'] as const;
export type Channel = typeof CHANNELS[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  feed_post: 'Feed Post',
  story: 'Story',
  newsletter: 'Newsletter',
};
