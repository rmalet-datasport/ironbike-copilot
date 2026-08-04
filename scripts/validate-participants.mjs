// One-off validation script — prints ONLY aggregate counts, never individual rows.
// Compares output against IRONBIKE_BRIEF.md §1.3 to sanity-check the parsing/cleaning logic.
// Run: node scripts/validate-participants.mjs

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const DATA_PATH = path.join(process.cwd(), 'data', 'participants.csv');
const REGISTERED_PATH = path.join(process.cwd(), 'data', 'Angemeldete Teilnehmende Iron Bike.xlsx');

const KERNRADIUS_PREFIXES = new Set(['64', '88', '87', '86', '63', '80', '81']);
const INNERSCHWEIZ_PREFIXES = new Set(['60']);

function detectDelimiter(headerLine) {
  const commas = headerLine.split(',').length;
  const semicolons = headerLine.split(';').length;
  return semicolons > commas ? ';' : ',';
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

function parseBirthDate(raw) {
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return {};
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return {};
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthday = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return { iso, age };
}

function deriveGeoZone(nationality, zip) {
  if (nationality !== 'SUI') return 'etranger';
  if (!zip || zip.length < 2) return 'unknown';
  const prefix = zip.slice(0, 2);
  if (KERNRADIUS_PREFIXES.has(prefix)) return 'kernradius';
  if (INNERSCHWEIZ_PREFIXES.has(prefix)) return 'innerschweiz';
  return 'reste_suisse';
}

function looksLikePlaceholder(value) {
  if (/^\d+$/.test(value)) return true;
  if (/^([a-zA-Z])\1{1,}$/i.test(value)) return true;
  if (/^(ref|refnr|nr|no)[\s_-]?\d+$/i.test(value)) return true;
  return false;
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const idx = Math.floor((p / 100) * (sortedAsc.length - 1));
  return sortedAsc[idx];
}

const raw = fs.readFileSync(DATA_PATH, 'utf-8');
const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
const delimiter = detectDelimiter(lines[0]);
const header = parseCsvLine(lines[0], delimiter).map(h => h.trim());
const columnIndex = name => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

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
  if (i === -1) throw new Error(`Colonne manquante: "${key}" — header détecté: ${header.join(' | ')}`);
}

let totalRows = 0;
let excludedNoise = 0;
let withEmail = 0, withZip = 0, withBirthDate = 0;
let genderM = 0, genderF = 0, genderUnknown = 0;
let sui = 0;
const ages = [];
const emailsSeen = new Map(); // email -> count of raw occurrences (pre-dedup)
let dedupExcluded = 0;
const seenDedupKeys = new Set();
const geoZoneCount = {};
const participants = []; // minimal in-memory {firstName,lastName,email,birthDate} — never printed

for (let i = 1; i < lines.length; i++) {
  const fields = parseCsvLine(lines[i], delimiter);
  const firstName = fields[idx.firstName] ?? '';
  const lastName = fields[idx.lastName] ?? '';
  if (!firstName && !lastName) continue;
  totalRows++;

  if (looksLikePlaceholder(firstName) || looksLikePlaceholder(lastName)) {
    excludedNoise++;
    continue;
  }

  const genderRaw = (fields[idx.gender] ?? '').trim().toUpperCase();
  if (genderRaw === 'M') genderM++;
  else if (genderRaw === 'F') genderF++;
  else genderUnknown++;

  const nationality = (fields[idx.nationIOC] ?? '').trim().toUpperCase() || 'unknown';
  if (nationality === 'SUI') sui++;

  const emailRaw = (fields[idx.email] ?? '').trim().toLowerCase();
  const zip = (fields[idx.zip] ?? '').trim() || undefined;
  const { iso: birthDate, age } = parseBirthDate((fields[idx.birthDate] ?? '').trim());

  if (emailRaw) {
    withEmail++;
    emailsSeen.set(emailRaw, (emailsSeen.get(emailRaw) ?? 0) + 1);
    const dedupKey = `${emailRaw}|${firstName.toLowerCase()}|${lastName.toLowerCase()}|${birthDate ?? ''}`;
    if (seenDedupKeys.has(dedupKey)) { dedupExcluded++; continue; }
    seenDedupKeys.add(dedupKey);
  }
  if (zip) withZip++;
  if (birthDate) { withBirthDate++; if (age != null) ages.push(age); }

  const zone = deriveGeoZone(nationality, zip);
  geoZoneCount[zone] = (geoZoneCount[zone] ?? 0) + 1;

  participants.push({ firstName, lastName, email: emailRaw || undefined, birthDate });
}

ages.sort((a, b) => a - b);
const uniqueEmails = emailsSeen.size;
const duplicatedEmails = [...emailsSeen.values()].filter(c => c > 1).length;

console.log('--- Validation participants.csv (agrégats uniquement) ---');
console.log('Total lignes (avec nom):', totalRows);
console.log('Exclues comme bruit:', excludedNoise);
console.log('Avec email:', withEmail, `(${(withEmail / totalRows * 100).toFixed(1)}%)`);
console.log('Avec zip:', withZip, `(${(withZip / totalRows * 100).toFixed(1)}%)`);
console.log('Avec date de naissance:', withBirthDate, `(${(withBirthDate / totalRows * 100).toFixed(1)}%)`);
console.log('Nationalité SUI:', sui, `(${(sui / totalRows * 100).toFixed(1)}%)`);
console.log('Genre: M=' + genderM, 'F=' + genderF, 'unknown=' + genderUnknown);
console.log('Age p25/p50/p75/p90:', percentile(ages, 25), percentile(ages, 50), percentile(ages, 75), percentile(ages, 90));
console.log('Emails uniques:', uniqueEmails, '— emails dupliqués (>1 occurrence):', duplicatedEmails);
console.log('Lignes exclues par dédup (email+nom+naissance):', dedupExcluded);
console.log('GeoZone distribution:', geoZoneCount);
console.log('--- Comparer avec le tableau §1.3 de IRONBIKE_BRIEF.md ---');

// --- Taux de match avec la liste des inscrits 2026 (agrégats uniquement) ---
if (fs.existsSync(REGISTERED_PATH)) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(REGISTERED_PATH);
  const sheet = wb.worksheets[0];

  const ALIASES = {
    firstName: ['vorname', 'firstname', 'prénom', 'prenom'],
    lastName: ['nachname', 'lastname', 'nom'],
    email: ['e-mail', 'email', 'mail'],
    birthDate: ['geburtsdatum', 'birthdate', 'date de naissance'],
  };
  const colIndex = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = String(cell.value ?? '').trim().toLowerCase();
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(raw)) colIndex[field] = colNumber;
    }
  });

  const byEmail = new Set(), byNameDob = new Set(), byNameOnly = new Set();
  let registeredRows = 0, registeredWithEmail = 0, registeredWithBirthDate = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const get = f => { const c = colIndex[f]; if (!c) return undefined; const v = row.getCell(c).value; return v == null ? undefined : String(v).trim() || undefined; };
    const firstName = get('firstName'), lastName = get('lastName');
    const email = get('email')?.toLowerCase();
    const birthDate = get('birthDate');
    if (!firstName && !lastName && !email) continue;
    registeredRows++;
    if (email) { registeredWithEmail++; byEmail.add(email); }
    if (firstName && lastName) {
      const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
      if (birthDate) { registeredWithBirthDate++; byNameDob.add(`${nameKey}|${birthDate}`); }
      else byNameOnly.add(nameKey);
    }
  }

  let matchedByEmail = 0, matchedByNameDob = 0, matchedByNameOnly = 0, unmatched = 0;
  for (const p of participants) {
    const nameKey = `${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}`;
    if (p.email && byEmail.has(p.email)) matchedByEmail++;
    else if (byNameDob.has(`${nameKey}|${p.birthDate ?? ''}`)) matchedByNameDob++;
    else if (byNameOnly.has(nameKey)) matchedByNameOnly++;
    else unmatched++;
  }
  const totalMatched = matchedByEmail + matchedByNameDob + matchedByNameOnly;

  console.log('\n--- Taux de match avec la liste des inscrits 2026 (agrégats uniquement) ---');
  console.log('Fichier:', path.basename(REGISTERED_PATH));
  console.log('Lignes inscrits:', registeredRows, `(avec email: ${registeredWithEmail}, avec date de naissance: ${registeredWithBirthDate})`);
  console.log('Participants historiques matchés "registered":', totalMatched, `sur ${participants.length} (${(totalMatched / participants.length * 100).toFixed(2)}%)`);
  console.log('  dont par email:', matchedByEmail);
  console.log('  dont par nom + date de naissance:', matchedByNameDob);
  console.log('  dont par nom seul (moins fiable):', matchedByNameOnly);
  console.log('Rappel : le nombre d\'inscrits (' + registeredRows + ') peut être > au nombre matché — les nouveaux inscrits qui n\'ont jamais couru l\'Iron Bike ne sont pas dans participants.csv (attendu, voir IRONBIKE_BRIEF.md).');
} else {
  console.log('\n(Aucun fichier d\'inscrits 2026 trouvé à', REGISTERED_PATH, '— skip du calcul de taux de match)');
}
