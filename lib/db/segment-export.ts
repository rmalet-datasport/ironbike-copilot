// SERVEUR UNIQUEMENT — construit le fichier d'export au format d'import rapidmail (colonnes
// Mailadresse/Vorname/Extra1/Startnummer — format fourni par l'équipe, voir CLAUDE.md
// §Données). Ne jamais importer depuis un composant 'use client'. Seule
// app/api/participants/export/route.ts doit utiliser ce module.
import ExcelJS from 'exceljs';
import type { Participant } from '@/lib/types/participant';

export interface RapidmailExport {
  buffer: ExcelJS.Buffer;
  rowCount: number;
}

// Extra1 (langue) et Startnummer restent vides — la segmentation par langue se fait en amont
// dans l'outil (nationalité/geoZone du segment), pas ligne par ligne dans ce fichier ; et
// Startnummer n'a pas d'équivalent avant course. Seules les personnes avec un email sont
// exportées : une ligne sans Mailadresse est inutilisable pour un import rapidmail. Dédupliqué
// par email (lower-case) avant écriture — un même email peut apparaître pour plusieurs personnes
// d'une même famille (compte partagé), et un envoi rapidmail ne doit adresser chaque boîte mail
// qu'une seule fois.
export async function toRapidmailXlsx(participants: Participant[]): Promise<RapidmailExport> {
  const seenEmails = new Set<string>();
  const reachable = participants.filter(p => {
    if (!p.email) return false;
    const key = p.email.toLowerCase();
    if (seenEmails.has(key)) return false;
    seenEmails.add(key);
    return true;
  });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Sheet1');
  sheet.addRow(['Mailadresse', 'Vorname', 'Extra1', 'Startnummer']);
  for (const p of reachable) {
    sheet.addRow([p.email, p.firstName, '', '']);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, rowCount: reachable.length };
}
