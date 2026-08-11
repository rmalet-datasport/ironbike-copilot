// One-off validation script — prints ONLY aggregate counts, never individual rows.
// Sanity-checks lib/db/prospects.ts's logic (consent filter, cross-file dedup, geoZone bucket)
// against the real MTB myDS export. Run: node scripts/validate-prospects.mjs
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const PARTICIPANTS_PATH = path.join(process.cwd(), 'data', 'participants.csv');
const REGISTERED_PATH = path.join(process.cwd(), 'data', 'Angemeldete Teilnehmende Iron Bike.xlsx');
const MTB_PATH = path.join(process.cwd(), 'data', 'mtb_myds_users_export_2026_08_07_1616.xlsx');

// Même règle que lib/db/geo-zone.ts.
const KERNRADIUS_PREFIXES = new Set(['64', '88', '87', '86', '63', '80', '81']);
const EXTRA_KERNRADIUS_CODES = new Set([
  8902, 8903, 8904, 8905, 8906, 8907, 8908, 8910, 8911, 8912, 8913, 8914, 8915, 8916, 8917, 8918,
  8919, 8925, 8926, 8932, 8933, 8934, 8942,
]);
const INNERSCHWEIZ_PREFIXES = new Set(['60']);

function bucketByZip(zip) {
  const prefix = zip.slice(0, 2);
  if (KERNRADIUS_PREFIXES.has(prefix)) return 'kernradius';
  const npa = Number(zip);
  if (Number.isFinite(npa) && EXTRA_KERNRADIUS_CODES.has(npa)) return 'kernradius';
  if (INNERSCHWEIZ_PREFIXES.has(prefix)) return 'innerschweiz';
  return 'reste_suisse';
}

function deriveProspectGeoZone(zip) {
  const match = zip?.match(/^\d+/);
  if (!match) return 'unknown';
  const digits = match[0];
  if (digits.length === 4) return bucketByZip(digits);
  if (digits.length === 5) return 'etranger';
  return 'unknown';
}

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

// --- participants.csv emails ---
const rawCsv = fs.readFileSync(PARTICIPANTS_PATH, 'utf-8');
const csvLines = rawCsv.split(/\r?\n/).filter(l => l.trim().length > 0);
const delim = detectDelimiter(csvLines[0]);
const csvHeader = parseCsvLine(csvLines[0], delim).map(h => h.trim().toLowerCase());
const emailColCsv = csvHeader.indexOf('email');
const participantEmails = new Set();
for (let i = 1; i < csvLines.length; i++) {
  const email = (parseCsvLine(csvLines[i], delim)[emailColCsv] ?? '').trim().toLowerCase();
  if (email) participantEmails.add(email);
}

// --- Angemeldete registered emails ---
const registeredEmails = new Set();
if (fs.existsSync(REGISTERED_PATH)) {
  const wbReg = new ExcelJS.Workbook();
  await wbReg.xlsx.readFile(REGISTERED_PATH);
  const sheetReg = wbReg.worksheets[0];
  let emailColReg = null;
  sheetReg.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = String(cell.value ?? '').trim().toLowerCase();
    if (['e-mail', 'email', 'mail'].includes(raw)) emailColReg = colNumber;
  });
  if (emailColReg) {
    for (let r = 2; r <= sheetReg.rowCount; r++) {
      const v = sheetReg.getRow(r).getCell(emailColReg).value;
      const email = v == null ? '' : String(v).trim().toLowerCase();
      if (email) registeredEmails.add(email);
    }
  }
}

console.log('--- Fichiers Iron Bike existants (agrégats uniquement) ---');
console.log('participants.csv — emails uniques:', participantEmails.size);
console.log('Angemeldete 2026 — emails uniques:', registeredEmails.size);

if (!fs.existsSync(MTB_PATH)) {
  console.log('\n(Fichier MTB introuvable à', MTB_PATH, '— rien à valider)');
  process.exit(0);
}

// --- MTB export ---
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(MTB_PATH);
const sheet = wb.worksheets[0];

const header = {};
sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
  header[String(cell.value ?? '').trim().toLowerCase()] = colNumber;
});

const byPerson = new Map();
let totalRows = 0;

for (let r = 2; r <= sheet.rowCount; r++) {
  const row = sheet.getRow(r);
  const get = (name) => {
    const c = header[name];
    if (!c) return undefined;
    const v = row.getCell(c).value;
    return v == null ? undefined : v;
  };
  const personId = String(get('myds_person_id') ?? '').trim();
  const email = String(get('email') ?? '').trim().toLowerCase();
  if (!personId || !email) continue;
  totalRows++;

  const zip = String(get('plz') ?? '').trim() || undefined;
  const sportAbo = Number(get('nl_sportnews_abo') ?? 0) === 1;
  const unsubRaw = get('nl_abgemeldet_am');
  const unsubscribed = unsubRaw != null && String(unsubRaw).trim() !== '';

  const existing = byPerson.get(personId);
  if (!existing) {
    byPerson.set(personId, { email, zip, sportAbo, unsubscribed, editions: 1 });
  } else {
    existing.editions++;
    existing.sportAbo = existing.sportAbo || sportAbo;
    existing.unsubscribed = existing.unsubscribed || unsubscribed;
  }
}

console.log('\n--- Export MTB myDS (agrégats uniquement) ---');
console.log('Lignes brutes (user x édition):', totalRows);
console.log('Personnes uniques (myds_person_id):', byPerson.size);

let consented = 0, unsubscribedCount = 0, excludedIronBikeHistory = 0, excludedRegistered2026 = 0;
const geoZoneCount = {};
let finalMailable = 0;

for (const p of byPerson.values()) {
  if (p.sportAbo) consented++;
  if (p.unsubscribed) unsubscribedCount++;
  if (!p.sportAbo || p.unsubscribed) continue;

  if (participantEmails.has(p.email)) { excludedIronBikeHistory++; continue; }
  if (registeredEmails.has(p.email)) { excludedRegistered2026++; continue; }

  finalMailable++;
  const zone = deriveProspectGeoZone(p.zip);
  geoZoneCount[zone] = (geoZoneCount[zone] ?? 0) + 1;
}

console.log('Consentement sportnews_abo=1 (au moins une ligne):', consented);
console.log('Désabonnés (nl_abgemeldet_am renseigné sur au moins une ligne):', unsubscribedCount);
console.log('Exclus car déjà dans participants.csv (Iron Bike historique):', excludedIronBikeHistory);
console.log('Exclus car déjà inscrits Iron Bike 2026:', excludedRegistered2026);
console.log('=> Prospects MTB finaux (mailables, dédupliqués des 2 fichiers Iron Bike):', finalMailable);
console.log('Distribution geoZone des prospects finaux:', geoZoneCount);
