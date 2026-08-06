import { NextRequest } from 'next/server';
import { filterParticipants } from '@/lib/db/segment-filter';
import { toRapidmailXlsx } from '@/lib/db/segment-export';
import type { FilterCondition } from '@/lib/types/segments';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filters: FilterCondition[] = body.filters ?? [];
    const scopeFilterGroups: FilterCondition[][] | undefined = body.scopeFilterGroups ?? undefined;

    const pool = await filterParticipants(filters, scopeFilterGroups);
    const { buffer } = await toRapidmailXlsx(pool);

    return new Response(buffer, {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });
  } catch (err) {
    console.error('[participants/export]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
