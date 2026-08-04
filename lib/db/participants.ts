// SERVEUR UNIQUEMENT. Ce module charge le fichier réel de participants (18 607 personnes,
// noms/emails/dates de naissance réels — voir IRONBIKE_BRIEF.md §1). Ne JAMAIS l'importer
// depuis un composant 'use client' : le dataset ne doit jamais atteindre le bundle navigateur.
// Seuls les agrégats calculés par ce module (comptes, stats) doivent être exposés au client,
// via les routes app/api/participants/*.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import type { Participant, GeoZone } from '@/lib/types/participant';

const DATA_PATH = path.join(process.cwd(), 'data', 'participants.csv');

// Nom de fichier attendu pour la liste des inscrits 2026 — chaque collègue place sa copie
// (même nom exact) dans son data/ local. Voir IRONBIKE_BRIEF.md §4.1bis.
const REGISTERED_PATH = path.join(process.cwd(), 'data', 'Angemeldete Teilnehmende Iron Bike.xlsx');

// Bucket approximatif par préfixe NPA — voir IRONBIKE_BRIEF.md §2.2. Ce n'est pas une distance
// calculée : ne pas s'appuyer sur ce bucket comme fiable au NPA près (P1 : géocodage précis).
const KERNRADIUS_PREFIXES = new Set(['64', '88', '87', '86', '63', '80', '81']);
const INNERSCHWEIZ_PREFIXES = new Set(['60']);

function detectDelimiter(headerLine: string): string {
  const commas = headerLine.split(',').length;
  const semicolons = headerLine.split(';').length;
  return semicolons > commas ? ';' : ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBirthDate(raw: string): { iso?: string; age?: number } {
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return {};
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return {};

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;

  return { iso, age };
}

function deriveGeoZone(nationality: string, zip?: string): GeoZone {
  if (nationality !== 'SUI') return 'etranger';
  if (!zip || zip.length < 2) return 'unknown';
  const prefix = zip.slice(0, 2);
  if (KERNRADIUS_PREFIXES.has(prefix)) return 'kernradius';
  if (INNERSCHWEIZ_PREFIXES.has(prefix)) return 'innerschweiz';
  return 'reste_suisse';
}

// Heuristique approximative pour exclure le bruit de saisie évident (~28 lignes attendues sur
// 18 607, voir IRONBIKE_BRIEF.md §1.2) : Refnr ayant fuité dans un champ nom, ou placeholder du
// type "Aaa"/"Bbb". N'a pas la donnée réelle sous la main pour cibler précisément ces lignes.
function looksLikePlaceholder(value: string): boolean {
  if (/^\d+$/.test(value)) return true;
  if (/^([a-zA-Z])\1{1,}$/i.test(value)) return true;
  if (/^(ref|refnr|nr|no)[\s_-]?\d+$/i.test(value)) return true;
  return false;
}

function hashId(parts: string[]): string {
  const digest = crypto.createHash('sha256').update(parts.join('|').toLowerCase()).digest('hex');
  return `P-${digest.slice(0, 12)}`;
}

export interface PrimoInscritStats {
  count: number;
  genderM: number;
  genderF: number;
  genderUnknown: number;
}

const EMPTY_PRIMO_STATS: PrimoInscritStats = { count: 0, genderM: 0, genderF: 0, genderUnknown: 0 };

interface LoadResult {
  participants: Participant[];
  primoInscrits: PrimoInscritStats;
}

let cachedPromise: Promise<LoadResult> | null = null;

function loadAll(): Promise<LoadResult> {
  if (!cachedPromise) {
    cachedPromise = computeAll();
  }
  return cachedPromise;
}

// Charge participants.csv, puis fusionne avec la liste des inscrits 2026 si le fichier
// REGISTERED_PATH existe localement (voir mergeRegistrationStatus + findPrimoInscrits). Mis
// en cache une seule fois par process — redémarrer le serveur de dev après avoir mis à jour
// l'un des deux fichiers.
async function computeAll(): Promise<LoadResult> {
  const base = parseParticipantsCsv();
  if (!fs.existsSync(REGISTERED_PATH)) return { participants: base, primoInscrits: EMPTY_PRIMO_STATS };
  const registeredList = await loadRegisteredList(REGISTERED_PATH);
  const participants = mergeRegistrationStatus(base, registeredList);
  const primoInscrits = findPrimoInscrits(base, registeredList);
  return { participants, primoInscrits };
}

export function getParticipants(): Promise<Participant[]> {
  return loadAll().then(r => r.participants);
}

// Inscrits 2026 qui n'existent dans aucune ligne de participants.csv — donc jamais couru
// l'Iron Bike avant. Pas de Participant complet possible pour eux (aucune donnée démographique
// dans l'export des inscrits au-delà du genre) : juste un compte + répartition genre, voir
// IRONBIKE_BRIEF.md — traitement ajouté à la demande, pas dans le brief initial.
export function getPrimoInscritsStats(): Promise<PrimoInscritStats> {
  return loadAll().then(r => r.primoInscrits);
}

function parseParticipantsCsv(): Participant[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = parseCsvLine(lines[0], delimiter).map(h => h.trim());
  const columnIndex = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const idx = {
    firstName: columnIndex('firstName'),
    lastName: columnIndex('lastName'),
    gender: columnIndex('gender'),
    birthDate: columnIndex('birthDate'),
    nationIOC: columnIndex('nationIOC'),
    email: columnIndex('email'),
    zip: columnIndex('zip'),
    town: columnIndex('town'),
  };

  for (const [key, i] of Object.entries(idx)) {
    if (i === -1) throw new Error(`participants.csv: colonne manquante "${key}"`);
  }

  const seenKeys = new Set<string>();
  const participants: Participant[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i], delimiter);
    const firstName = fields[idx.firstName] ?? '';
    const lastName = fields[idx.lastName] ?? '';
    if (!firstName && !lastName) continue;
    if (looksLikePlaceholder(firstName) || looksLikePlaceholder(lastName)) continue;

    const genderRaw = (fields[idx.gender] ?? '').trim().toUpperCase();
    const gender: Participant['gender'] = genderRaw === 'M' || genderRaw === 'F' ? genderRaw : 'unknown';
    const nationality = (fields[idx.nationIOC] ?? '').trim().toUpperCase() || 'unknown';
    const emailRaw = (fields[idx.email] ?? '').trim().toLowerCase();
    const email = emailRaw || undefined;
    const zip = (fields[idx.zip] ?? '').trim() || undefined;
    const town = (fields[idx.town] ?? '').trim() || undefined;
    const { iso: birthDate, age } = parseBirthDate((fields[idx.birthDate] ?? '').trim());

    // Dédup par email + nom + date de naissance combinés (pas email seul) — évite de fusionner
    // des membres d'une même famille qui partagent un email. Voir IRONBIKE_BRIEF.md §1.2.
    if (email) {
      const dedupKey = `${email}|${firstName.toLowerCase()}|${lastName.toLowerCase()}|${birthDate ?? ''}`;
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
    }

    participants.push({
      id: hashId([firstName, lastName, birthDate ?? '', email ?? '', zip ?? '']),
      firstName,
      lastName,
      gender,
      birthDate,
      age,
      nationality,
      email,
      hasEmail: !!email,
      zip,
      town,
      geoZone: deriveGeoZone(nationality, zip),
      hasParticipatedBefore: true,
      registrationStatus2026: 'unknown',
    });
  }

  return participants;
}

export interface RegisteredEntry {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // ISO yyyy-mm-dd — absent dans l'export actuel (colonnes Vorname/Nachname/Geschlecht/E-Mail uniquement)
  gender?: 'M' | 'F' | 'unknown';
}

const REGISTERED_COLUMN_ALIASES: Record<'firstName' | 'lastName' | 'email' | 'birthDate' | 'gender', string[]> = {
  firstName: ['vorname', 'firstname', 'prénom', 'prenom'],
  lastName: ['nachname', 'lastname', 'nom'],
  email: ['e-mail', 'email', 'mail'],
  birthDate: ['geburtsdatum', 'birthdate', 'date de naissance'],
  gender: ['geschlecht', 'gender', 'genre', 'sexe'],
};

async function loadRegisteredList(filePath: string): Promise<RegisteredEntry[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const colIndex: Partial<Record<keyof RegisteredEntry, number>> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = String(cell.value ?? '').trim().toLowerCase();
    for (const [field, aliases] of Object.entries(REGISTERED_COLUMN_ALIASES) as [keyof RegisteredEntry, string[]][]) {
      if (aliases.includes(raw)) colIndex[field] = colNumber;
    }
  });

  const entries: RegisteredEntry[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const get = (field: keyof RegisteredEntry) => {
      const c = colIndex[field];
      if (!c) return undefined;
      const v = row.getCell(c).value;
      return v == null ? undefined : String(v).trim() || undefined;
    };
    const genderRaw = get('gender')?.trim().toUpperCase();
    const entry: RegisteredEntry = {
      firstName: get('firstName'),
      lastName: get('lastName'),
      email: get('email')?.toLowerCase(),
      birthDate: get('birthDate'),
      gender: genderRaw === 'M' || genderRaw === 'F' ? genderRaw : 'unknown',
    };
    if (entry.firstName || entry.lastName || entry.email) entries.push(entry);
  }
  return entries;
}

// Matche par email en priorité (le champ le plus fiable des deux côtés), repli sur
// nom + date de naissance, puis repli sur nom seul si aucune date de naissance n'est
// disponible côté inscrits (cas de l'export actuel — colonnes Vorname/Nachname/E-Mail
// uniquement). Le repli nom seul est la fusion la moins fiable (collisions possibles sur des
// noms courants) — voir IRONBIKE_BRIEF.md §4.1bis : le taux de match ne sera jamais 100%.
// Une fois une liste chargée, tout participant non matché devient 'not_registered' (le
// dataset historique complet sert de référentiel négatif).
export function mergeRegistrationStatus(
  participants: Participant[],
  registeredList: RegisteredEntry[]
): Participant[] {
  const byEmail = new Set<string>();
  const byNameDob = new Set<string>();
  const byNameOnly = new Set<string>();

  for (const entry of registeredList) {
    if (entry.email) byEmail.add(entry.email.trim().toLowerCase());
    if (entry.firstName && entry.lastName) {
      const nameKey = `${entry.firstName.trim().toLowerCase()}|${entry.lastName.trim().toLowerCase()}`;
      if (entry.birthDate) byNameDob.add(`${nameKey}|${entry.birthDate}`);
      else byNameOnly.add(nameKey);
    }
  }

  return participants.map(p => {
    const nameKey = `${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}`;
    const matchedByEmail = !!p.email && byEmail.has(p.email);
    const matchedByNameDob = byNameDob.has(`${nameKey}|${p.birthDate ?? ''}`);
    const matchedByNameOnly = byNameOnly.has(nameKey);
    const matched = matchedByEmail || matchedByNameDob || matchedByNameOnly;
    return {
      ...p,
      registrationStatus2026: (matched ? 'registered' : 'not_registered') as Participant['registrationStatus2026'],
    };
  });
}

// Inverse de mergeRegistrationStatus : inscrits 2026 qui ne matchent AUCUNE ligne de
// participants.csv (email / nom+naissance / nom seul) — donc jamais couru l'Iron Bike avant.
// Mêmes trois paliers de confiance, dans l'autre sens.
function findPrimoInscrits(participants: Participant[], registeredList: RegisteredEntry[]): PrimoInscritStats {
  const emailSet = new Set<string>();
  const nameDobSet = new Set<string>();
  const nameOnlySet = new Set<string>();

  for (const p of participants) {
    if (p.email) emailSet.add(p.email);
    const nameKey = `${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}`;
    if (p.birthDate) nameDobSet.add(`${nameKey}|${p.birthDate}`);
    nameOnlySet.add(nameKey);
  }

  const stats: PrimoInscritStats = { count: 0, genderM: 0, genderF: 0, genderUnknown: 0 };

  for (const entry of registeredList) {
    const nameKey = entry.firstName && entry.lastName
      ? `${entry.firstName.toLowerCase()}|${entry.lastName.toLowerCase()}`
      : undefined;
    const matchedByEmail = !!entry.email && emailSet.has(entry.email);
    const matchedByNameDob = !!nameKey && !!entry.birthDate && nameDobSet.has(`${nameKey}|${entry.birthDate}`);
    const matchedByNameOnly = !!nameKey && nameOnlySet.has(nameKey);

    if (!matchedByEmail && !matchedByNameDob && !matchedByNameOnly) {
      stats.count++;
      if (entry.gender === 'M') stats.genderM++;
      else if (entry.gender === 'F') stats.genderF++;
      else stats.genderUnknown++;
    }
  }

  return stats;
}
