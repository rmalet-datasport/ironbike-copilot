'use client';

import { useState } from 'react';
import GateTimeline from '@/components/gates/GateTimeline';
import SegmentCard from '@/components/gates/SegmentCard';
import ChannelSelector from '@/components/gates/ChannelSelector';
import CampaignGenerator from '@/components/campaign/CampaignGenerator';
import SegmentBuilder from '@/components/gates/SegmentBuilder';
import SegmentStatsDrawer from '@/components/gates/SegmentStatsDrawer';
import { EVENT } from '@/lib/constants';
import type { Channel } from '@/lib/constants';
import { PREDEFINED_SEGMENTS } from '@/lib/segments/predefined';
import type { CustomSegment, FilterCondition } from '@/lib/types/segments';
import { buildSegmentDescription, FILTER_FIELD_LABELS, FILTER_VALUE_OPTIONS } from '@/lib/types/segments';
import { useParticipantCounts } from '@/lib/hooks/useParticipantCounts';

const SEGMENTS = PREDEFINED_SEGMENTS.gate3;

type DrawerData = { name: string; description: string; color: string; criteria: { l: string; v: string }[]; filters: FilterCondition[]; segmentId: string }

export default function FinishPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [customSegments, setCustomSegments] = useState<CustomSegment[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSegment, setEditingSegment] = useState<CustomSegment | null>(null);
  const [statsDrawer, setStatsDrawer] = useState<DrawerData | null>(null);

  const selectedStatic = SEGMENTS.find(s => s.id === selectedId);
  const selectedCustom = customSegments.find(s => s.id === selectedId);

  const counts = useParticipantCounts([
    { id: 'total', filters: [] as FilterCondition[] },
    { id: 'reachable', filters: [{ id: 'r1', field: 'hasEmail', value: 'true' }] as FilterCondition[] },
    ...SEGMENTS.map(s => ({ id: s.id, filters: s.filters })),
    ...customSegments.map(s => ({ id: s.id, filters: s.filters })),
  ]);

  const handleSelect = (id: string) => {
    if (selectedId === id) { setSelectedId(null); setChannels([]); return; }
    setSelectedId(id);
    const staticSeg = SEGMENTS.find(s => s.id === id);
    setChannels(staticSeg ? staticSeg.channels : ['newsletter']);
  };

  const handleSaveCustom = (seg: CustomSegment) => {
    if (editingSegment) {
      setCustomSegments(prev => prev.map(s => s.id === seg.id ? seg : s));
    } else {
      setCustomSegments(prev => [...prev, seg]);
    }
    setShowBuilder(false);
    setEditingSegment(null);
    handleSelect(seg.id);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomSegments(prev => prev.filter(s => s.id !== id));
    if (selectedId === id) { setSelectedId(null); setChannels([]); }
  };

  const handleViewStats = (seg: typeof SEGMENTS[0]) => {
    setStatsDrawer({ name: seg.label, description: seg.description, color: seg.color, criteria: [], filters: seg.filters, segmentId: seg.id });
  };

  const handleViewStatsCustom = (seg: CustomSegment) => {
    setStatsDrawer({
      name: seg.name, description: seg.objective ?? '', color: seg.color,
      criteria: seg.filters.map(f => ({ l: FILTER_FIELD_LABELS[f.field], v: FILTER_VALUE_OPTIONS[f.field]?.find(o => o.value === f.value)?.label ?? f.value })),
      filters: seg.filters, segmentId: seg.id,
    });
  };

  const handleEditPredefined = (seg: typeof SEGMENTS[0]) => {
    setEditingSegment({ id: `${seg.id}_custom`, name: seg.label, color: seg.color, colorBg: seg.colorBg, filters: [...seg.filters], baseSegmentIds: [], baseSegmentLabels: [], objective: seg.objective });
    setShowBuilder(true);
  };

  return (
    <div className="ironbike-gate-page" style={{ padding: '0 28px 28px' }}>
      <GateTimeline activeGate="finish" />

      {/* KPI strip — chiffres réels ou constants, jamais fabriqués */}
      <div className="ironbike-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0' }}>
        {[
          { label: 'Total Basis', value: counts.total !== undefined ? counts.total.toLocaleString('en-US') : '…', sub: 'Alle Austragungen' },
          { label: 'Per E-Mail erreichbar', value: counts.reachable !== undefined ? counts.reachable.toLocaleString('en-US') : '…', sub: '72,1% der Basis' },
          { label: 'Austragung', value: `${EVENT.edition}.`, sub: 'letzte Austragung' },
          { label: 'Renndatum', value: new Date(EVENT.raceDate).toLocaleDateString('de-CH'), sub: EVENT.city },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 570, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="ironbike-gate-layout" style={{ display: 'flex', gap: 20 }}>
        <div className="ironbike-gate-left" style={{ flex: selectedId ? '0 0 380px' : '1 1 auto', maxWidth: selectedId ? 380 : 700, display: 'flex', flexDirection: 'column', gap: 8, transition: 'flex-basis 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 570, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Renntag &amp; danach</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-3)' }}>{(counts.total ?? 0).toLocaleString('en-US')} total participants in this gate</span>
            </div>
            <button
              onClick={() => setShowBuilder(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-2)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Create a segment
            </button>
          </div>

          {SEGMENTS.map(seg => (
            <SegmentCard
              key={seg.id}
              segment={seg.id}
              label={seg.label}
              size={counts[seg.id] ?? 0}
              description={seg.description}
              color={seg.color}
              colorBg={seg.colorBg}
              channels={seg.channels}
              isSelected={selectedId === seg.id}
              onClick={() => handleSelect(seg.id)}
              onViewStats={() => handleViewStats(seg)}
              onEdit={() => handleEditPredefined(seg)}
              icon={seg.icon}
            />
          ))}

          {/* Custom segments */}
          {customSegments.length > 0 && customSegments.map(seg => (
            <div
              key={seg.id}
              onClick={() => handleSelect(seg.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: selectedId === seg.id ? seg.colorBg : 'var(--bg-1)', border: `1.5px solid ${selectedId === seg.id ? seg.color : 'var(--border-1)'}`, borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 570, color: 'var(--fg-1)' }}>{seg.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 570, fontFamily: 'var(--font-mono)', color: selectedId === seg.id ? seg.color : 'var(--fg-1)' }}>{(counts[seg.id] ?? 0).toLocaleString('en-US')}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>Custom segment</div>
                <div onClick={e => { e.stopPropagation(); handleViewStatsCustom(seg); }} style={{ fontSize: 12, fontWeight: 570, color: 'var(--primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  View statistics <span style={{ fontSize: 13 }}>→</span>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setEditingSegment(seg); setShowBuilder(true); }} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--fg-2)', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9l6-6 2 2-6 6H1.5V9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 3.5l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Edit
              </button>
              <button onClick={e => { e.stopPropagation(); handleDeleteCustom(seg.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Right: campaign panel */}
        {selectedStatic ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-xl)', padding: '20px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedStatic.color, display: 'inline-block' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 570, margin: 0 }}>{selectedStatic.label}</h3>
                  <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                    {(counts[selectedStatic.id] ?? 0).toLocaleString('en-US')} participants
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>{selectedStatic.objective}</p>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: 20 }} />
              <div style={{ marginBottom: 20 }}>
                <ChannelSelector
                  available={selectedStatic.channels}
                  selected={channels}
                  onChange={setChannels}
                  rationale={selectedStatic.rationale}
                />
              </div>
              <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: 20 }} />
              <CampaignGenerator
                gate="gate3"
                segment={selectedStatic.id}
                channels={channels}
                segmentSize={counts[selectedStatic.id] ?? 0}
                gateLabel="Renntag & danach"
                segmentName={selectedStatic.label}
                segmentColor={selectedStatic.color}
                segmentColorBg={selectedStatic.colorBg}
                promoMode="siblingEvents"
              />
            </div>
          </div>
        ) : selectedCustom ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-xl)', padding: '20px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedCustom.color, display: 'inline-block' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 570, margin: 0 }}>{selectedCustom.name}</h3>
                  <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                    {(counts[selectedCustom.id] ?? 0).toLocaleString('en-US')} participants
                  </span>
                  <span style={{ fontSize: 10, color: selectedCustom.color, background: selectedCustom.colorBg, padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: 570, letterSpacing: '0.04em' }}>
                    CUSTOM
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                  {selectedCustom.objective ?? buildSegmentDescription(selectedCustom)}
                </p>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: 20 }} />
              <div style={{ marginBottom: 20 }}>
                <ChannelSelector available={['newsletter', 'feed_post', 'story']} selected={channels} onChange={setChannels} />
              </div>
              <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: 20 }} />
              <CampaignGenerator
                gate="gate3"
                segment="custom_segment"
                channels={channels}
                segmentSize={counts[selectedCustom.id] ?? 0}
                segmentDescription={buildSegmentDescription(selectedCustom)}
                gateLabel="Renntag & danach"
                segmentName={selectedCustom.name}
                segmentColor={selectedCustom.color}
                segmentColorBg={selectedCustom.colorBg}
                promoMode="siblingEvents"
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--fg-3)', padding: 40 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.3">
              <path d="M8 20h24M20 8v24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 240, margin: 0 }}>
              Select a segment to generate your thank-you / cross-sell campaign
            </p>
          </div>
        )}
      </div>

      {(showBuilder || editingSegment) && (
        <SegmentBuilder
          existingCount={customSegments.length}
          gateSegments={SEGMENTS}
          initialSegment={editingSegment ?? undefined}
          onClose={() => { setShowBuilder(false); setEditingSegment(null); }}
          onSave={handleSaveCustom}
        />
      )}

      {statsDrawer && (
        <SegmentStatsDrawer
          isOpen={!!statsDrawer}
          onClose={() => setStatsDrawer(null)}
          segmentName={statsDrawer.name}
          segmentDescription={statsDrawer.description}
          segmentColor={statsDrawer.color}
          criteria={statsDrawer.criteria}
          filters={statsDrawer.filters}
          onGenerateCampaign={() => { handleSelect(statsDrawer.segmentId); setStatsDrawer(null); }}
        />
      )}
    </div>
  );
}
