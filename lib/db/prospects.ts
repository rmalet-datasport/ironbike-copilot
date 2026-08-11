// SERVEUR UNIQUEMENT. Charge l'export myDS des athlètes MTB (57 837 personnes distinctes,
// export réel — noms/emails réels, voir IRONBIKE_BRIEF.md). Ne JAMAIS importer ce module depuis
// un composant 'use client'. Seul lib/db/participants.ts (computeAll) doit l'utiliser ; le
// résultat est concaténé au pool participants avant d'être exposé via app/api/participants/*.
//
// Source distincte de participants.csv : ces gens ont couru au moins une course MTB Datasport
// (toutes disciplines, tous événements) ces 5 dernières années (2021+), pas spécifiquement
// l'Iron Bike — voir source: 'mtb_prospect' sur le Participant produit. Deux garde-fous
// appliqués AVANT qu'une personne n'entre dans le pool filtrable (jamais un filtrage a
// posteriori côté UI) :
//   1. Consentement newsletter réel (voir email du dev, à respecter à la lettre) : seuls les
//      gens avec nl_sportnews_abo=1 et sans nl_abgemeldet_am renseigné sont conservés.
//      nl_double_optin n'est qu'un signal de qualité secondaire, jamais un filtre bloquant.
//   2. Dédoublonnage : toute personne dont l'email apparaît dans participants.csv (a déjà couru
//      l'Iron Bike) ou dans la liste des inscrits 2026 est exclue — l'export MTB n'est pas
//      limité aux gens n'ayant jamais fait l'Iron Bike, juste "au moins une course MTB".
import path from 'path';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import type { Participant } from '@/lib/types/participant';
import { bucketByZip } from './geo-zone';
import { readLocalOrBlob } from './data-source';

const MTB_PATH = path.join(process.cwd(), 'data', 'mtb_myds_users_export_2026_08_07_1616.xlsx');

const COLUMN_ALIASES = {
  personId: ['myds_person_id'],
  firstName: ['vorname'],
  email: ['email'],
  zip: ['plz'],
  edition: ['edition'],
  year: ['jahr'],
  contestDistance: ['contest_distanz'],
  sportAbo: ['nl_sportnews_abo'],
  unsubscribedAt: ['nl_abgemeldet_am'],
} as const;

type ColumnKey = keyof typeof COLUMN_ALIASES;

interface RawRow {
  personId: string;
  firstName: string;
  email: string;
  zip?: string;
  edition?: string;
  year?: number;
  contestDistance?: string;
  sportAbo: boolean;
  unsubscribed: boolean;
}

interface ProspectAgg {
  firstName: string;
  email: string;
  zip?: string;
  editionCount: number;
  lastYear: number;
  lastRace: string;
  sportAbo: boolean;
  unsubscribed: boolean;
}

function hashId(parts: string[]): string {
  const digest = crypto.createHash('sha256').update(parts.join('|').toLowerCase()).digest('hex');
  return `P-${digest.slice(0, 12)}`;
}

// NPA brut (pas de nationalité dans cet export) : 4 chiffres en tête -> heuristique "plausiblement
// suisse", même règle que participants.csv (approximatif, voir geo-zone.ts) ; 5 chiffres en
// tête -> étranger (majorité DE/IT/FR dans cet export, voir description du dev) ; sinon inconnu.
// Gère au passage les formats bruités observés dans l'export réel ("3753 Oey", "6137BL", "test").
function deriveProspectGeoZone(zip?: string): Participant['geoZone'] {
  const match = zip?.match(/^\d+/);
  if (!match) return 'unknown';
  const digits = match[0];
  if (digits.length === 4) return bucketByZip(digits);
  if (digits.length === 5) return 'etranger';
  return 'unknown';
}

async function parseSheet(buffer: Buffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs's own Buffer type
  // comes from a differently-hoisted @types/node than the ambient one; same type at runtime.
  await wb.xlsx.load(buffer as any);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const colIndex: Partial<Record<ColumnKey, number>> = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = String(cell.value ?? '').trim().toLowerCase();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [ColumnKey, readonly string[]][]) {
      if ((aliases as readonly string[]).includes(raw)) colIndex[field] = colNumber;
    }
  });
  if (!colIndex.personId || !colIndex.email) return [];

  const rows: RawRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cellValue = (field: ColumnKey) => {
      const c = colIndex[field];
      if (!c) return undefined;
      return row.getCell(c).value;
    };
    const personId = String(cellValue('personId') ?? '').trim();
    const email = String(cellValue('email') ?? '').trim().toLowerCase();
    if (!personId || !email) continue;

    const yearRaw = cellValue('year');
    const year = yearRaw != null && yearRaw !== '' ? Number(yearRaw) : undefined;
    const unsubscribedRaw = cellValue('unsubscribedAt');

    rows.push({
      personId,
      firstName: String(cellValue('firstName') ?? '').trim(),
      email,
      zip: String(cellValue('zip') ?? '').trim() || undefined,
      edition: String(cellValue('edition') ?? '').trim() || undefined,
      year: Number.isFinite(year) ? year : undefined,
      contestDistance: String(cellValue('contestDistance') ?? '').trim() || undefined,
      sportAbo: Number(cellValue('sportAbo') ?? 0) === 1,
      unsubscribed: unsubscribedRaw != null && String(unsubscribedRaw).trim() !== '',
    });
  }
  return rows;
}

// Regroupe les lignes édition par personId (jamais par email seul — un email peut être partagé
// en famille, voir note du dev). Le consentement newsletter (sportAbo/unsubscribed) est un
// attribut de la personne, dupliqué sur chaque ligne : on prend le OR logique par prudence (si
// une seule ligne indique un désabonnement, la personne est considérée désabonnée).
function groupByPerson(rows: RawRow[]): Map<string, ProspectAgg> {
  const byPerson = new Map<string, ProspectAgg>();
  for (const row of rows) {
    const existing = byPerson.get(row.personId);
    const lastRace = row.edition && row.contestDistance ? `${row.edition} — ${row.contestDistance}` : row.edition ?? '';
    if (!existing) {
      byPerson.set(row.personId, {
        firstName: row.firstName,
        email: row.email,
        zip: row.zip,
        editionCount: 1,
        lastYear: row.year ?? 0,
        lastRace,
        sportAbo: row.sportAbo,
        unsubscribed: row.unsubscribed,
      });
      continue;
    }
    existing.editionCount++;
    existing.sportAbo = existing.sportAbo || row.sportAbo;
    existing.unsubscribed = existing.unsubscribed || row.unsubscribed;
    if ((row.year ?? 0) > existing.lastYear) {
      existing.lastYear = row.year ?? existing.lastYear;
      existing.lastRace = lastRace || existing.lastRace;
    }
  }
  return byPerson;
}

// excludeEmails : emails (déjà lower-case) de participants.csv + de la liste des inscrits 2026 —
// voir lib/db/participants.ts computeAll(). Toute correspondance exclut la personne du pool de
// prospects, avant même de construire un Participant pour elle. hasRegisteredList indique si la
// liste des inscrits 2026 a réellement été chargée (fichier présent) : si non, on ne peut pas
// affirmer "not_registered" (on n'a alors exclu que contre participants.csv) — reste 'unknown'
// plutôt que de fabriquer une certitude qu'on n'a pas, même principe que pour les participants
// historiques (voir CLAUDE.md "Champs jamais fabriqués").
export async function loadProspects(excludeEmails: Set<string>, hasRegisteredList: boolean): Promise<Participant[]> {
  const buffer = await readLocalOrBlob(MTB_PATH, 'mtb-prospects.xlsx');
  if (!buffer) return [];

  const rows = await parseSheet(buffer);
  const byPerson = groupByPerson(rows);

  const prospects: Participant[] = [];
  for (const [personId, agg] of byPerson) {
    if (!agg.sportAbo || agg.unsubscribed) continue;
    if (excludeEmails.has(agg.email)) continue;

    prospects.push({
      id: hashId(['mtb-prospect', personId]),
      firstName: agg.firstName,
      lastName: '',
      gender: 'unknown',
      nationality: 'unknown',
      email: agg.email,
      hasEmail: true,
      zip: agg.zip,
      town: undefined,
      geoZone: deriveProspectGeoZone(agg.zip),
      source: 'mtb_prospect',
      hasParticipatedBefore: false,
      mtbHistory: {
        editionCount: agg.editionCount,
        lastYear: agg.lastYear,
        lastRace: agg.lastRace,
      },
      registrationStatus2026: hasRegisteredList ? 'not_registered' : 'unknown',
    });
  }

  return prospects;
}
