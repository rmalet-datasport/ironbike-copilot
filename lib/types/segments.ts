export type FilterField =
  | 'gender'
  | 'age_min'
  | 'age_max'
  | 'nationality'
  | 'geoZone'
  | 'hasEmail'
  | 'registrationStatus2026'
  | 'source'

export interface FilterCondition {
  id: string
  field: FilterField
  value: string
}

export interface CustomSegment {
  id: string
  name: string
  color: string
  colorBg: string
  filters: FilterCondition[]
  baseSegmentIds: string[]    // empty = all participants in the gate
  baseSegmentLabels: string[] // human-readable labels for display
  objective?: string          // free-text context for AI generation
}

export const FILTER_FIELD_LABELS: Record<FilterField, string> = {
  gender: 'Gender',
  age_min: 'Min age',
  age_max: 'Max age',
  nationality: 'Nationality',
  geoZone: 'Geo zone',
  hasEmail: 'Reachable by email',
  registrationStatus2026: '2026 registration status',
  source: 'Source',
}

export const FILTER_VALUE_OPTIONS: Partial<Record<FilterField, { value: string; label: string }[]>> = {
  gender: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'unknown', label: 'Unknown' },
  ],
  nationality: [
    { value: 'SUI', label: 'Switzerland' },
    { value: 'GER', label: 'Germany' },
    { value: 'AUT', label: 'Austria' },
    { value: 'ITA', label: 'Italy' },
    { value: 'FRA', label: 'France' },
    { value: 'unknown', label: 'Unknown' },
  ],
  geoZone: [
    { value: 'kernradius', label: 'Kernradius (~45 min from Einsiedeln)' },
    { value: 'innerschweiz', label: 'Innerschweiz (Luzern area)' },
    { value: 'reste_suisse', label: 'Rest of Switzerland' },
    { value: 'innerschweiz,reste_suisse', label: 'Switzerland outside Kernradius' },
    { value: 'etranger', label: 'Abroad' },
    { value: 'unknown', label: 'Unknown' },
  ],
  hasEmail: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ],
  registrationStatus2026: [
    { value: 'registered', label: 'Registered' },
    { value: 'not_registered', label: 'Not registered' },
    { value: 'unknown', label: 'Unknown' },
  ],
  source: [
    { value: 'iron_bike_history', label: 'Iron Bike (already raced)' },
    { value: 'mtb_prospect', label: 'MTB prospect (never raced Iron Bike)' },
  ],
}

export const CUSTOM_SEGMENT_COLORS = [
  { color: '#7C3AED', colorBg: '#F5F3FF' },
  { color: '#0891B2', colorBg: '#ECFEFF' },
  { color: '#DB2777', colorBg: '#FDF2F8' },
  { color: '#059669', colorBg: '#ECFDF5' },
  { color: '#D97706', colorBg: '#FFFBEB' },
]

export function buildSegmentDescription(segment: CustomSegment): string {
  const parts: string[] = []

  if (segment.baseSegmentIds.length > 0) {
    parts.push(`Scope: ${segment.baseSegmentLabels.join(', ')}`)
  }

  if (segment.filters.length > 0) {
    const filterLabels = segment.filters.map(f => {
      const valueLabel = FILTER_VALUE_OPTIONS[f.field]?.find(o => o.value === f.value)?.label ?? f.value
      return `${FILTER_FIELD_LABELS[f.field]} = ${valueLabel}`
    })
    parts.push(`Criteria: ${filterLabels.join(', ')}`)
  }

  if (segment.objective) {
    parts.push(`Objective: ${segment.objective}`)
  }

  if (parts.length === 0) {
    return `Custom segment: "${segment.name}" (all participants, no filters)`
  }

  return `Custom segment: "${segment.name}"\n${parts.join('\n')}`
}
