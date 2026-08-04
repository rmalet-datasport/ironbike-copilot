'use client';

import { useState, useEffect } from 'react';
import type { FilterCondition } from '@/lib/types/segments';
import type { ParticipantStats } from '@/lib/db/segment-stats';

interface Criteria { l: string; v: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  segmentName: string
  segmentDescription: string
  segmentColor: string
  criteria: Criteria[]
  filters: FilterCondition[]
  scopeFilterGroups?: FilterCondition[][]
  onGenerateCampaign?: () => void
}

export default function SegmentStatsDrawer({
  isOpen, onClose, segmentName, segmentDescription, segmentColor,
  criteria, filters, scopeFilterGroups, onGenerateCampaign,
}: Props) {
  const [stats, setStats] = useState<ParticipantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    fetch('/api/participants/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, scopeFilterGroups }),
    })
      .then(res => res.json())
      .then(data => { if (!cancelled) { setStats(data.stats ?? null); setIsLoading(false); } })
      .catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, JSON.stringify(filters), JSON.stringify(scopeFilterGroups)]);

  const accent = segmentColor;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(20,20,20,0.45)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <aside
        className="sparta-stats-drawer"
        style={{
          position: 'fixed', top: 0, right: 0,
          height: '100vh', width: 540,
          background: 'var(--bg-1)',
          boxShadow: '-8px 0 40px rgba(20,20,20,0.14)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(.2,.8,.2,1)',
          zIndex: 50,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="sparta-stats-drawer-header" style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--border-1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: segmentColor + '22',
                border: `1.5px solid ${segmentColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: segmentColor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 570 }}>Segment statistics</div>
                <div style={{ fontSize: 17, fontWeight: 570, color: 'var(--fg-1)', marginTop: 2 }}>{segmentName}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'var(--bg-2)', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 15, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >✕</button>
          </div>

          {segmentDescription && (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '14px 0 0', lineHeight: 1.5 }}>{segmentDescription}</p>
          )}

          {criteria.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {criteria.map((cr, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 10px', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 11, whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cr.l}</span>
                  <span style={{ color: 'var(--fg-1)', fontWeight: 570 }}>{cr.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="sparta-stats-drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 30 }}>
          {isLoading ? (
            <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Loading…</p>
          ) : !stats ? (
            <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>No participant matches this segment.</p>
          ) : (
            <>
              {/* KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Total participants', value: stats.total.toLocaleString('en-US') },
                  { label: 'Reachable by email', value: stats.hasEmailPct + '%', colored: true },
                  { label: '2026 registered', value: stats.registrationStatus.registered + '%' },
                  { label: '2026 status unknown', value: stats.registrationStatus.unknown + '%' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 570 }}>{kpi.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, color: kpi.colored ? accent : 'var(--fg-1)', marginTop: 7, lineHeight: 1 }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {stats.registrationStatus.unknown === 100 && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
                  Keine Daten zur Anmeldung 2026 geladen — dieser Wert bedeutet nicht, dass niemand angemeldet ist. Vor jedem Versand über den onreg-Export bereinigen.
                </div>
              )}

              {/* Geo zones */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 570, color: 'var(--fg-1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Geo zone</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.geoZones.map(z => (
                    <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg-2)', width: 150, flexShrink: 0 }}>{z.label}</div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: z.bar + '%', background: accent, borderRadius: 99 }} />
                      </div>
                      <div style={{ width: 38, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-1)' }}>{z.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nationalities */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 570, color: 'var(--fg-1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Nationalities</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.nationalities.map(n => (
                    <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg-2)', width: 150, flexShrink: 0 }}>{n.label}</div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: n.bar + '%', background: 'var(--fg-2)', borderRadius: 99 }} />
                      </div>
                      <div style={{ width: 38, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-1)' }}>{n.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Age & Gender */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 570, color: 'var(--fg-1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Age & Gender</div>
                <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ width: stats.genderM + '%', background: 'var(--fg-1)' }} />
                  <div style={{ width: stats.genderF + '%', background: accent }} />
                  {stats.genderUnknown > 0 && <div style={{ width: stats.genderUnknown + '%', background: 'var(--border-1)' }} />}
                </div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: `Men ${stats.genderM}%`, color: 'var(--fg-1)' },
                    { label: `Women ${stats.genderF}%`, color: accent },
                    ...(stats.genderUnknown > 0 ? [{ label: `Unknown ${stats.genderUnknown}%`, color: 'var(--border-1)' }] : []),
                  ].map(g => (
                    <span key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-3)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: g.color, flexShrink: 0 }} />{g.label}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {stats.ageBuckets.map(a => (
                    <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg-2)', width: 58, flexShrink: 0 }}>{a.label}</div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: a.bar + '%', background: 'var(--fg-2)', borderRadius: 99 }} />
                      </div>
                      <div style={{ width: 38, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-1)' }}>{a.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sparta-stats-drawer-footer" style={{ padding: '16px 28px', borderTop: '1px solid var(--border-1)', display: 'flex', gap: 12, flexShrink: 0, background: 'var(--bg-1)' }}>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, padding: '11px 18px', border: '1px solid var(--border-1)', background: 'var(--bg-1)', borderRadius: 6, fontFamily: 'var(--font-sans, inherit)', fontWeight: 570, fontSize: 14, cursor: 'pointer', color: 'var(--fg-1)' }}
          >
            Close
          </button>
          {onGenerateCampaign && (
            <button
              onClick={() => { onClose(); onGenerateCampaign(); }}
              style={{ flex: 1, padding: '11px 18px', border: 'none', background: accent, color: '#fff', borderRadius: 6, fontWeight: 570, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Generate campaign →
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
