'use client';

import { useState, useEffect } from 'react';
import type { CustomSegment, FilterCondition, FilterField } from '@/lib/types/segments';
import {
  FILTER_FIELD_LABELS,
  FILTER_VALUE_OPTIONS,
  CUSTOM_SEGMENT_COLORS,
} from '@/lib/types/segments';
import type { PredefinedSegment } from '@/lib/segments/predefined';
import { exportSegmentList, slugifyForFilename } from '@/lib/utils/exportSegment';

const ALL_FIELDS: FilterField[] = [
  'gender', 'age_min', 'age_max', 'nationality', 'geoZone', 'hasEmail', 'registrationStatus2026', 'source',
];

interface SegmentBuilderProps {
  existingCount: number
  gateSegments: PredefinedSegment[]
  initialSegment?: CustomSegment
  onClose: () => void
  onSave: (segment: CustomSegment) => void
}

export default function SegmentBuilder({
  existingCount,
  gateSegments,
  initialSegment,
  onClose,
  onSave,
}: SegmentBuilderProps) {
  const [name, setName] = useState(() => initialSegment?.name ?? '');
  const [objective, setObjective] = useState(() => initialSegment?.objective ?? '');
  const [filters, setFilters] = useState<FilterCondition[]>(() => initialSegment?.filters ?? []);
  const [selectedBaseIds, setSelectedBaseIds] = useState<string[]>(() => initialSegment?.baseSegmentIds ?? []);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const scopeFilterGroups = selectedBaseIds.length > 0
    ? gateSegments.filter(s => selectedBaseIds.includes(s.id)).map(s => s.filters)
    : undefined;

  useEffect(() => {
    let cancelled = false;
    setIsCounting(true);
    const timer = setTimeout(() => {
      fetch('/api/participants/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, scopeFilterGroups }),
      })
        .then(res => res.json())
        .then(data => { if (!cancelled) { setMatchCount(data.count ?? 0); setIsCounting(false); } })
        .catch(() => { if (!cancelled) setIsCounting(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), JSON.stringify(scopeFilterGroups)]);

  const toggleBase = (id: string) => {
    setSelectedBaseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const usedFields = new Set(filters.map(f => f.field));
  const canAdd = usedFields.size < ALL_FIELDS.length;

  const addFilter = () => {
    const field = ALL_FIELDS.find(f => !usedFields.has(f));
    if (!field) return;
    const defaultValue = FILTER_VALUE_OPTIONS[field]?.[0]?.value ?? '';
    setFilters(prev => [...prev, { id: `f${prev.length}_${Date.now()}`, field, value: defaultValue }]);
  };

  const updateFilter = (id: string, patch: Partial<Pick<FilterCondition, 'field' | 'value'>>) => {
    setFilters(prev => prev.map(f => {
      if (f.id !== id) return f;
      if (patch.field && patch.field !== f.field) {
        return { ...f, field: patch.field, value: FILTER_VALUE_OPTIONS[patch.field]?.[0]?.value ?? '' };
      }
      return { ...f, ...patch };
    }));
  };

  const removeFilter = (id: string) => setFilters(prev => prev.filter(f => f.id !== id));

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const filename = `${slugifyForFilename(name || 'segment')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      await exportSegmentList(filters, scopeFilterGroups, filename);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const { color, colorBg } = initialSegment
      ? { color: initialSegment.color, colorBg: initialSegment.colorBg }
      : CUSTOM_SEGMENT_COLORS[existingCount % CUSTOM_SEGMENT_COLORS.length];
    const baseSegmentLabels = gateSegments
      .filter(s => selectedBaseIds.includes(s.id))
      .map(s => s.label);
    onSave({
      id: initialSegment?.id ?? `custom_${Date.now()}`,
      name: name.trim(),
      color,
      colorBg,
      filters,
      baseSegmentIds: selectedBaseIds,
      baseSegmentLabels,
      objective: objective.trim() || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-1)',
    background: 'var(--bg-1)',
    color: 'var(--fg-1)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-1)', borderRadius: 'var(--radius-xl)', padding: 28, width: 540, maxWidth: '92vw', border: '1px solid var(--border-1)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 570, color: 'var(--fg-1)' }}>
          {initialSegment ? 'Edit segment' : 'New segment'}
        </h3>

        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="E.g. Frauen 40-55 im Kernradius"
            style={{ ...inputStyle, width: '100%' }}
            autoFocus
          />
        </div>

        {gateSegments.length > 0 && (
          <>
            {/* Scope */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scope</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  onClick={() => setSelectedBaseIds([])}
                  style={{ padding: '5px 11px', borderRadius: 'var(--radius-full)', border: `1.5px solid ${selectedBaseIds.length === 0 ? 'var(--fg-2)' : 'var(--border-1)'}`, background: selectedBaseIds.length === 0 ? 'var(--fg-1)' : 'var(--bg-1)', color: selectedBaseIds.length === 0 ? 'var(--bg-1)' : 'var(--fg-3)', fontSize: 11, fontWeight: selectedBaseIds.length === 0 ? 570 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  All participants
                </button>
                {gateSegments.map(seg => {
                  const isActive = selectedBaseIds.includes(seg.id);
                  return (
                    <button
                      key={seg.id}
                      onClick={() => toggleBase(seg.id)}
                      style={{ padding: '5px 11px', borderRadius: 'var(--radius-full)', border: `1.5px solid ${isActive ? seg.color : 'var(--border-1)'}`, background: isActive ? seg.color : 'var(--bg-1)', color: isActive ? 'white' : 'var(--fg-2)', fontSize: 11, fontWeight: isActive ? 570 : 400, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      {!isActive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: seg.color, display: 'inline-block', flexShrink: 0 }} />}
                      {seg.label}
                    </button>
                  );
                })}
              </div>
              {selectedBaseIds.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fg-3)' }}>
                  Filters applied to {selectedBaseIds.length === 1 ? 'this segment' : `these ${selectedBaseIds.length} segments`}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-1)', marginBottom: 20 }} />
          </>
        )}

        {/* Demographic filters */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Filters
            {filters.length > 0 && <span style={{ marginLeft: 6, color: 'var(--primary)', fontWeight: 570 }}>{filters.length}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filters.map(f => (
              <FilterRow
                key={f.id}
                filter={f}
                usedFields={usedFields}
                onChange={patch => updateFilter(f.id, patch)}
                onRemove={() => removeFilter(f.id)}
                inputStyle={inputStyle}
              />
            ))}
          </div>

          {canAdd && (
            <button
              onClick={addFilter}
              style={{ marginTop: filters.length > 0 ? 8 : 0, width: '100%', padding: '7px 0', border: '1px dashed var(--border-2)', borderRadius: 'var(--radius-md)', background: 'none', color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Add a filter
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-1)', marginBottom: 20 }} />

        {/* Objective */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Objective & context
            <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— guides AI generation</span>
          </div>
          <textarea
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder="E.g. Personalisierte Reaktivierung, nostalgisch-trockener Ton, kein Emoji-Overkill."
            rows={2}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* Match count */}
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-2)', border: '1px solid var(--border-1)', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 570, fontFamily: 'var(--font-mono)', color: 'var(--fg-1)' }}>
            {isCounting || matchCount === null ? '…' : matchCount.toLocaleString('en-US')}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
            {selectedBaseIds.length === 0 && filters.length === 0
              ? 'participants (no filter applied)'
              : 'participants match these criteria'}
          </span>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || !matchCount}
          style={{ width: '100%', padding: '8px 0', marginBottom: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-2)', fontSize: 12, cursor: isExporting || !matchCount ? 'not-allowed' : 'pointer', opacity: !matchCount ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isExporting ? 'Exporting…' : 'Export for rapidmail (.xlsx)'}
        </button>
        {exportError && (
          <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 8 }}>{exportError}</div>
        )}
        <div style={{ marginBottom: 16 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-2)', fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            style={{ padding: '8px 18px', borderRadius: 'var(--radius-md)', border: 'none', background: name.trim() ? 'var(--primary)' : 'var(--bg-3)', color: name.trim() ? 'white' : 'var(--fg-3)', fontSize: 13, fontWeight: 570, cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}
          >
            {initialSegment ? 'Save changes' : 'Create segment'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FilterRowProps {
  filter: FilterCondition;
  usedFields: Set<FilterField>;
  onChange: (patch: Partial<Pick<FilterCondition, 'field' | 'value'>>) => void;
  onRemove: () => void;
  inputStyle: React.CSSProperties;
}

const NUMERIC_FIELDS: FilterField[] = ['age_min', 'age_max'];

const FIELD_PLACEHOLDERS: Partial<Record<FilterField, string>> = {
  age_min: 'Ex: 40',
  age_max: 'Ex: 60',
};

const FIELD_LIMITS: Partial<Record<FilterField, { min: number; max: number }>> = {
  age_min: { min: 16, max: 90 },
  age_max: { min: 16, max: 90 },
};

function FilterRow({ filter, usedFields, onChange, onRemove, inputStyle }: FilterRowProps) {
  const availableFields = ALL_FIELDS.filter(f => f === filter.field || !usedFields.has(f));
  const isSelect = !!FILTER_VALUE_OPTIONS[filter.field];
  const isNumeric = NUMERIC_FIELDS.includes(filter.field);
  const limits = FIELD_LIMITS[filter.field];

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={filter.field}
        onChange={e => onChange({ field: e.target.value as FilterField })}
        style={{ ...inputStyle, flex: '0 0 auto' }}
      >
        {availableFields.map(f => (
          <option key={f} value={f}>{FILTER_FIELD_LABELS[f]}</option>
        ))}
      </select>

      {isSelect ? (
        <select value={filter.value} onChange={e => onChange({ value: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
          {FILTER_VALUE_OPTIONS[filter.field]!.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : isNumeric ? (
        <input
          type="number"
          value={filter.value}
          onChange={e => onChange({ value: e.target.value })}
          placeholder={FIELD_PLACEHOLDERS[filter.field]}
          min={limits?.min}
          max={limits?.max}
          style={{ ...inputStyle, flex: 1 }}
        />
      ) : null}

      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
