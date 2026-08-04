// SERVEUR UNIQUEMENT. Ce module charge le fichier réel de participants (18 607 personnes,
// noms/emails/dates de naissance réels — voir IRONBIKE_BRIEF.md §1). Ne JAMAIS l'importer
// depuis un composant 'use client' : le dataset ne doit jamais atteindre le bundle navigateur.
// Seuls les agrégats calculés par ce module (comptes, stats) doivent être exposés au client,
// via les routes app/api/participants/*.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Participant, GeoZone } from '@/lib/types/participant';

const DATA_PATH = path.join(process.cwd(), 'data', 'participants.csv');

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

let cached: Participant[] | null = null;

export function getParticipants(): Participant[] {
  if (cached) return cached;

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    cached = [];
    return cached;
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

  cached = participants;
  return participants;
}

export interface RegisteredEntry {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // ISO yyyy-mm-dd
}

// Matche par email en priorité (le champ le plus fiable des deux côtés), repli sur
// nom + date de naissance. Ne sera jamais 100% (noms mal orthographiés, emails changés) —
// voir IRONBIKE_BRIEF.md §4.1bis. Une fois une liste chargée, tout participant non matché
// devient 'not_registered' (le dataset historique complet sert de référentiel négatif).
export function mergeRegistrationStatus(
  participants: Participant[],
  registeredList: RegisteredEntry[]
): Participant[] {
  const byEmail = new Set<string>();
  const byNameDob = new Set<string>();

  for (const entry of registeredList) {
    if (entry.email) byEmail.add(entry.email.trim().toLowerCase());
    if (entry.firstName && entry.lastName && entry.birthDate) {
      byNameDob.add(`${entry.firstName.trim().toLowerCase()}|${entry.lastName.trim().toLowerCase()}|${entry.birthDate}`);
    }
  }

  return participants.map(p => {
    const matchedByEmail = !!p.email && byEmail.has(p.email);
    const matchedByNameDob = byNameDob.has(`${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}|${p.birthDate ?? ''}`);
    return {
      ...p,
      registrationStatus2026: (matchedByEmail || matchedByNameDob ? 'registered' : 'not_registered') as Participant['registrationStatus2026'],
    };
  });
}
