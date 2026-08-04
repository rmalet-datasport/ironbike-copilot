// SERVEUR UNIQUEMENT — n'opère que sur des Participant[] déjà en mémoire côté serveur.
// Ne renvoie que des agrégats : c'est cette forme (jamais la liste brute) qui doit être
// exposée au client via les routes app/api/participants/*.
import type { Participant } from '../types/participant'

export interface BucketStat {
  label: string
  pct: number
  bar: number // relatif au max du groupe, pour un bar chart 0-100
}

export interface ParticipantStats {
  total: number
  hasEmailPct: number
  genderM: number
  genderF: number
  genderUnknown: number
  ageBuckets: BucketStat[]
  geoZones: BucketStat[]
  nationalities: BucketStat[]
  registrationStatus: { registered: number; notRegistered: number; unknown: number }
}

const GEO_ZONE_LABELS: Record<string, string> = {
  kernradius: 'Kernradius',
  innerschweiz: 'Innerschweiz',
  reste_suisse: 'Reste de la Suisse',
  etranger: 'Étranger',
  unknown: 'Inconnu',
}

const NATIONALITY_LABELS: Record<string, string> = {
  SUI: 'Suisse',
  GER: 'Allemagne',
  AUT: 'Autriche',
  ITA: 'Italie',
  FRA: 'France',
  unknown: 'Inconnu',
}

function pctOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function bucketize(pool: Participant[], keyFn: (p: Participant) => string, labelMap?: Record<string, string>, limit = 6): BucketStat[] {
  const counts: Record<string, number> = {}
  for (const p of pool) {
    const key = keyFn(p)
    counts[key] = (counts[key] ?? 0) + 1
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit)
  const max = Math.max(...entries.map(([, n]) => n), 1)
  return entries.map(([key, n]) => ({
    label: labelMap?.[key] ?? key,
    pct: pctOf(n, pool.length),
    bar: Math.round((n / max) * 100),
  }))
}

export function computeStats(pool: Participant[]): ParticipantStats | null {
  if (pool.length === 0) return null
  const n = pool.length

  const genderM = pctOf(pool.filter(p => p.gender === 'M').length, n)
  const genderF = pctOf(pool.filter(p => p.gender === 'F').length, n)
  const genderUnknown = Math.max(0, 100 - genderM - genderF)

  const hasEmailPct = pctOf(pool.filter(p => p.hasEmail).length, n)

  const ageBucketDefs: { label: string; test: (age: number) => boolean }[] = [
    { label: '< 30', test: a => a < 30 },
    { label: '30–39', test: a => a >= 30 && a < 40 },
    { label: '40–49', test: a => a >= 40 && a < 50 },
    { label: '50–59', test: a => a >= 50 && a < 60 },
    { label: '60–69', test: a => a >= 60 && a < 70 },
    { label: '70+', test: a => a >= 70 },
  ]
  const withAge = pool.filter(p => p.age !== undefined)
  const ageBuckets: BucketStat[] = ageBucketDefs.map(b => {
    const count = withAge.filter(p => b.test(p.age as number)).length
    return { label: b.label, pct: pctOf(count, withAge.length), bar: 0 }
  })
  const ageMax = Math.max(...ageBuckets.map(b => b.pct), 1)
  ageBuckets.forEach(b => { b.bar = Math.round((b.pct / ageMax) * 100) })

  const geoZones = bucketize(pool, p => p.geoZone, GEO_ZONE_LABELS)
  const nationalities = bucketize(pool, p => p.nationality, NATIONALITY_LABELS)

  const registrationStatus = {
    registered: pctOf(pool.filter(p => p.registrationStatus2026 === 'registered').length, n),
    notRegistered: pctOf(pool.filter(p => p.registrationStatus2026 === 'not_registered').length, n),
    unknown: pctOf(pool.filter(p => p.registrationStatus2026 === 'unknown').length, n),
  }

  return {
    total: n,
    hasEmailPct,
    genderM,
    genderF,
    genderUnknown,
    ageBuckets,
    geoZones,
    nationalities,
    registrationStatus,
  }
}
