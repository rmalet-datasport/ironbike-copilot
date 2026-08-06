'use client';

import type { FilterCondition } from '@/lib/types/segments';

export function slugifyForFilename(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || 'segment';
}

// Format d'import rapidmail (Mailadresse/Vorname/Extra1/Startnummer) — voir
// lib/db/segment-export.ts pour la construction du fichier côté serveur.
export async function exportSegmentList(
  filters: FilterCondition[],
  scopeFilterGroups: FilterCondition[][] | undefined,
  filename: string
): Promise<void> {
  const res = await fetch('/api/participants/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, scopeFilterGroups }),
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
