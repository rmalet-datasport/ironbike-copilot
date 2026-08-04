import { NextRequest } from 'next/server';
import { filterParticipants } from '@/lib/db/segment-filter';
import type { FilterCondition } from '@/lib/types/segments';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filters: FilterCondition[] = body.filters ?? [];
    const scopeFilterGroups: FilterCondition[][] | undefined = body.scopeFilterGroups ?? undefined;

    const count = filterParticipants(filters, scopeFilterGroups).length;

    return Response.json({ count });
  } catch (err) {
    console.error('[participants/count]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
