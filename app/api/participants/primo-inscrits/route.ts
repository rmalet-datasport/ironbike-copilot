import { getPrimoInscritsStats } from '@/lib/db/participants';

export async function GET() {
  try {
    const stats = await getPrimoInscritsStats();
    return Response.json({ stats });
  } catch (err) {
    console.error('[participants/primo-inscrits]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
