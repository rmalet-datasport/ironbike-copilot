import { NextRequest } from 'next/server';
import { filterParticipants } from '@/lib/db/segment-filter';
import { computeStats } from '@/lib/db/segment-stats';
import type { FilterCondition } from '@/lib/types/segments';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filters: FilterCondition[] = body.filters ?? [];
    const scopeFilterGroups: FilterCondition[][] | undefined = body.scopeFilterGroups ?? undefined;

    const pool = await filterParticipants(filters, scopeFilterGroups);
    const stats = computeStats(pool);

    return Response.json({ stats });
  } catch (err) {
    console.error('[participants/stats]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
