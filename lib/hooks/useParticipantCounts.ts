'use client';

import { useState, useEffect } from 'react';
import type { FilterCondition } from '@/lib/types/segments';

export interface CountQuery {
  id: string;
  filters: FilterCondition[];
  scopeFilterGroups?: FilterCondition[][];
}

async function fetchCount(filters: FilterCondition[], scopeFilterGroups?: FilterCondition[][]): Promise<number> {
  const res = await fetch('/api/participants/count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, scopeFilterGroups }),
  });
  const data = await res.json();
  return data.count ?? 0;
}

// Compte réel (pas de mise à l'échelle) pour un ensemble de requêtes — voir IRONBIKE_BRIEF.md §3.
export function useParticipantCounts(queries: CountQuery[]): Record<string, number | undefined> {
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const key = JSON.stringify(queries);

  useEffect(() => {
    let cancelled = false;
    Promise.all(queries.map(q => fetchCount(q.filters, q.scopeFilterGroups).then(count => [q.id, count] as const)))
      .then(entries => {
        if (cancelled) return;
        setCounts(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return counts;
}

export function useParticipantCount(filters: FilterCondition[], scopeFilterGroups?: FilterCondition[][]): number | undefined {
  const counts = useParticipantCounts([{ id: 'single', filters, scopeFilterGroups }]);
  return counts.single;
}
