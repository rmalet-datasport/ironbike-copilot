// Métadonnées pures (pas de données participant) — safe à importer côté client ET serveur.
// Utilisé par les pages gate (affichage) et par app/api/ai/route.ts (calcul de la taille réelle
// du segment pour le prompt). Voir IRONBIKE_BRIEF.md §4.

import type { Channel } from '@/lib/constants';
import type { FilterCondition } from '@/lib/types/segments';

export interface PredefinedSegment {
  id: string;
  label: string;
  icon: string;
  color: string;
  colorBg: string;
  description: string;
  objective: string;
  filters: FilterCondition[];
  channels: Channel[];
  rationale?: Partial<Record<Channel, string>>;
}

export const PREDEFINED_SEGMENTS: Record<string, PredefinedSegment[]> = {
  gate0: [
    {
      id: 'toute_la_base',
      label: 'Ganze Basis',
      icon: '📣',
      color: '#2563EB',
      colorBg: '#EFF6FF',
      description: 'Alle 18’607 bisherigen Teilnehmer:innen, alle Austragungen kombiniert — ca. 72% per E-Mail erreichbar.',
      objective: 'Newsletter 1 (Ankündigung an alle) + Post 1 + Pressemitteilung + Post 2 (Foto-Aufruf).',
      filters: [],
      channels: ['newsletter', 'feed_post'],
      rationale: {
        newsletter: 'Erreicht die ganze Basis unabhängig vom Wohnort.',
        feed_post: 'Öffentliche Ankündigung, teilbar über die Community.',
      },
    },
  ],

  gate1: [
    {
      id: 'reactivation_kernradius',
      label: 'Reaktivierung — Kernradius',
      icon: '🎯',
      color: '#16A34A',
      colorBg: '#F0FDF4',
      description: 'Per E-Mail erreichbar, wohnhaft im Kernradius (~45 Min. von Einsiedeln).',
      objective: 'Newsletter 2 (wichtigster Hebel) — Personalisierung wenn möglich, nostalgisch-trockener Ton.',
      filters: [
        { id: 'p1', field: 'hasEmail', value: 'true' },
        { id: 'p2', field: 'geoZone', value: 'kernradius' },
      ],
      channels: ['newsletter', 'story'],
      rationale: {
        newsletter: 'Direkter Kanal für die wichtigste Reaktivierungs-Zielgruppe.',
        story: 'Countdown-Begleitung für die geografisch nahe Basis.',
      },
    },
    {
      id: 'reactivation_hors_kernradius',
      label: 'Reaktivierung — übrige Schweiz',
      icon: '🚴',
      color: '#EA580C',
      colorBg: '#FFF7ED',
      description: 'Per E-Mail erreichbar, Schweiz aber ausserhalb des Kernradius.',
      objective: 'Newsletter 2/3 — etwas mehr Anreiseaufwand ansprechen, gleicher trockener Ton.',
      filters: [
        { id: 'p1', field: 'hasEmail', value: 'true' },
        { id: 'p2', field: 'geoZone', value: 'innerschweiz,reste_suisse' },
      ],
      channels: ['newsletter'],
      rationale: { newsletter: 'Reaktivierung ohne geografische Dringlichkeit.' },
    },
    {
      id: 'reactivation_etranger',
      label: 'Reaktivierung — Ausland',
      icon: '🌍',
      color: '#7C3AED',
      colorBg: '#F5F3FF',
      description: 'Per E-Mail erreichbar, Wohnsitz ausserhalb der Schweiz.',
      objective: 'Newsletter 2/3 — Anreise explizit ansprechen, Reise als Teil des Rituals.',
      filters: [
        { id: 'p1', field: 'hasEmail', value: 'true' },
        { id: 'p2', field: 'geoZone', value: 'etranger' },
      ],
      channels: ['newsletter'],
      rationale: { newsletter: 'Einzige Zielgruppe, die die Reise explizit einplanen muss.' },
    },
    {
      id: 'non_joignable_email',
      label: 'Nicht per E-Mail erreichbar',
      icon: '✉️',
      color: '#6B7280',
      colorBg: '#F9FAFB',
      description: 'Keine E-Mail-Adresse im Datensatz — 27,9% der Basis. Entscheidung zum Kanal liegt ausserhalb des Tools.',
      objective: 'Kein Newsletter möglich. Allenfalls generische Feed/Story-Reichweite oder Postversand (ausserhalb des Tools).',
      filters: [{ id: 'p1', field: 'hasEmail', value: 'false' }],
      channels: [],
    },
  ],

  gate2: [],

  gate3: [
    {
      id: 'toute_la_base',
      label: 'Ganze Basis',
      icon: '🏁',
      color: '#D6001D',
      colorBg: '#FFF0F2',
      description: 'Alle 18’607 bisherigen Teilnehmer:innen — für den Dank nach der letzten Austragung.',
      objective: 'Newsletter 6 (Dank) + Abschlusspost, optional Cross-Sell zu den anderen Bike Marathon Classics.',
      filters: [],
      channels: ['newsletter', 'feed_post', 'story'],
      rationale: {
        newsletter: 'Persönlicher Dank an die ganze Basis.',
        feed_post: 'Öffentlicher Abschluss der 30. Austragung.',
        story: 'Live-Begleitung am Renntag.',
      },
    },
  ],
};
