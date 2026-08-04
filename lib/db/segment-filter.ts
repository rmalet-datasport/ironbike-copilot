// SERVEUR UNIQUEMENT — importe participants.ts (dataset réel). Ne jamais importer ce module
// depuis un composant 'use client' ; seules les routes app/api/participants/* doivent l'utiliser.
import { getParticipants } from './participants'
import type { FilterCondition } from '../types/segments'
import type { Participant } from '../types/participant'

function matchesAllFilters(p: Participant, filters: FilterCondition[]): boolean {
  return filters.every(f => {
    const v = f.value
    switch (f.field) {
      case 'gender':
        return p.gender === v
      case 'age_min':
        return v !== '' && p.age !== undefined && p.age >= parseInt(v)
      case 'age_max':
        return v !== '' && p.age !== undefined && p.age <= parseInt(v)
      case 'nationality':
        return p.nationality === v
      case 'geoZone':
        return v.split(',').includes(p.geoZone)
      case 'hasEmail':
        return p.hasEmail === (v === 'true')
      case 'registrationStatus2026':
        return p.registrationStatus2026 === v
      default:
        return true
    }
  })
}

// scopeFilterGroups : union (OR) de groupes de filtres (ex: les segments prédéfinis
// sélectionnés comme scope) — chaque groupe est évalué en AND, les groupes entre eux en OR.
// filters : appliqués en AND par-dessus le scope. Absence de scope = tous les participants.
export async function filterParticipants(
  filters: FilterCondition[],
  scopeFilterGroups?: FilterCondition[][]
): Promise<Participant[]> {
  let pool: Participant[] = await getParticipants()

  if (scopeFilterGroups && scopeFilterGroups.length > 0) {
    pool = pool.filter(p => scopeFilterGroups.some(group => matchesAllFilters(p, group)))
  }

  if (filters.length === 0) return pool

  return pool.filter(p => matchesAllFilters(p, filters))
}
