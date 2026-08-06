'use client';

import { useState } from 'react';
import GateTimeline from '@/components/gates/GateTimeline';
import SegmentCard from '@/components/gates/SegmentCard';
import ChannelSelector from '@/components/gates/ChannelSelector';
import CampaignGenerator from '@/components/campaign/CampaignGenerator';
import SegmentStatsDrawer from '@/components/gates/SegmentStatsDrawer';
import { EVENT } from '@/lib/constants';
import type { Channel } from '@/lib/constants';
import { PREDEFINED_SEGMENTS } from '@/lib/segments/predefined';
import { FILTER_FIELD_LABELS, FILTER_VALUE_OPTIONS } from '@/lib/types/segments';
import { useParticipantCounts } from '@/lib/hooks/useParticipantCounts';

const SEGMENTS = PREDEFINED_SEGMENTS.gate0;

type DrawerData = { name: string; description: string; color: string; criteria: { l: string; v: string }[]; segmentId: string }

export default function CreationPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [statsDrawer, setStatsDrawer] = useState<DrawerData | null>(null);

  const selected = SEGMENTS.find(s => s.id === selectedId);

  const counts = useParticipantCounts([
    { id: 'total', filters: [] },
    ...SEGMENTS.map(s => ({ id: s.id, filters: s.filters })),
  ]);
  const total = counts.total;

  const handleSelect = (id: string) => {
    if (selectedId === id) { setSelectedId(null); setChannels([]); return; }
    setSelectedId(id);
    const seg = SEGMENTS.find(s => s.id === id);
    setChannels(seg ? seg.channels : []);
  };

  const handleViewStats = (seg: typeof SEGMENTS[0]) => {
    setStatsDrawer({ name: seg.label, description: seg.description, color: seg.color, criteria: [], segmentId: seg.id });
  };

  return (
    <div className="ironbike-gate-page" style={{ padding: '0 28px 28px' }}>
      <GateTimeline activeGate="creation" />

      {/* KPI strip — chiffres réels ou constants, jamais fabriqués (voir IRONBIKE_BRIEF.md §1/§3) */}
      <div className="ironbike-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0' }}>
        {[
          { label: 'Total Basis', value: total !== undefined ? total.toLocaleString('en-US') : '…', sub: 'Alle Austragungen' },
          { label: 'Austragung', value: `${EVENT.edition}.`, sub: EVENT.isLastEdition ? 'letzte Austragung' : '' },
          { label: 'Renndatum', value: new Date(EVENT.raceDate).toLocaleDateString('de-CH'), sub: EVENT.city },
          { label: 'Kampagnenstart', value: new Date(EVENT.campaignStartDate).toLocaleDateString('de-CH'), sub: 'Ankündigung' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 570, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="ironbike-gate-layout" style={{ display: 'flex', gap: 20 }}>
        {/* Left */}
        <div className="ironbike-gate-left" style={{ flex: selectedId ? '0 0 380px' : '1 1 auto', maxWidth: selectedId ? 380 : 700, transition: 'flex-basis 0.2s ease' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 570, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ankündigung</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-3)' }}>Keine Feinsegmentierung — Newsletter 1 und Post 1 richten sich an alle.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                icon={seg.icon}
              />
            ))}
          </div>
        </div>

        {/* Right: campaign panel */}
        {selected ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-xl)', padding: '20px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{selected.icon}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 570, margin: 0 }}>{selected.label}</h3>
                  <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                    {(counts[selected.id] ?? 0).toLocaleString('en-US')} participants
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>{selected.objective}</p>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: 20 }} />
              <div style={{ marginBottom: 20 }}>
                <ChannelSelector
                  available={selected.channels}
                  selected={channels}
                  onChange={setChannels}
                  rationale={selected.rationale}
                />
              </div>
              <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: 20 }} />
              <CampaignGenerator
                gate="gate0"
                segment={selected.id}
                channels={channels}
                segmentSize={counts[selected.id] ?? 0}
                gateLabel="Ankündigung"
                segmentName={selected.label}
                segmentColor={selected.color}
                segmentColorBg={selected.colorBg}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--fg-3)', padding: 40 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.3">
              <rect x="8" y="10" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 10V8M26 10V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 18h24" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 240, margin: 0 }}>
              Select the segment to generate the announcement campaign
            </p>
          </div>
        )}
      </div>

      {statsDrawer && (
        <SegmentStatsDrawer
          isOpen={!!statsDrawer}
          onClose={() => setStatsDrawer(null)}
          segmentName={statsDrawer.name}
          segmentDescription={statsDrawer.description}
          segmentColor={statsDrawer.color}
          criteria={statsDrawer.criteria}
          filters={SEGMENTS.find(s => s.id === statsDrawer.segmentId)?.filters ?? []}
          onGenerateCampaign={() => { handleSelect(statsDrawer.segmentId); setStatsDrawer(null); }}
        />
      )}
    </div>
  );
}
