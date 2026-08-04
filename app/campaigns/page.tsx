'use client';

import { useState, useEffect } from 'react';
import { useCampaignHistory, type SavedAsset } from '@/lib/context/CampaignHistoryContext';
import AssetCard from '@/components/campaign/AssetCard';

const GATE_COLORS: Record<string, { color: string; bg: string }> = {
  gate0: { color: '#7C3AED', bg: '#F5F3FF' },
  gate1: { color: '#2563EB', bg: '#EFF6FF' },
  gate2: { color: '#EA580C', bg: '#FFF7ED' },
  gate3: { color: '#16A34A', bg: '#F0FDF4' },
};

const CHANNEL_COLORS: Record<string, { color: string; bg: string }> = {
  feed_post:  { color: '#2563EB', bg: '#EFF6FF' },
  story:      { color: '#7C3AED', bg: '#F5F3FF' },
  newsletter: { color: '#16A34A', bg: '#F0FDF4' },
};

const CHANNEL_LABELS: Record<string, string> = {
  feed_post: 'Feed Post',
  story: 'Story',
  newsletter: 'Newsletter',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  feed_post: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3" y="3" width="6" height="3.5" rx="0.5" fill="currentColor" opacity="0.25"/>
    </svg>
  ),
  story: (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
      <rect x="1.5" y="0.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3" y="2" width="7" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  newsletter: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="2.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 5l5.5 3L12 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getPreview(asset: SavedAsset['asset']): string {
  return asset.subject ?? asset.copy ?? asset.sentence ?? asset.body ?? '';
}

export default function CampaignsPage() {
  const { savedAssets, removeAsset, updateAsset } = useCampaignHistory();
  const [selected, setSelected] = useState<SavedAsset | null>(null);
  const [modalSaved, setModalSaved] = useState(false);

  useEffect(() => { setModalSaved(false); }, [selected?.id]);

  return (
    <div style={{ padding: '28px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 570, color: 'var(--fg-1)' }}>
          Saved assets
        </h1>
        {savedAssets.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
            {savedAssets.length}
          </span>
        )}
      </div>

      {/* Empty state */}
      {savedAssets.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: '80px 40px', color: 'var(--fg-3)', textAlign: 'center',
          background: 'var(--bg-1)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-1)',
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.35">
            <path d="M8 5h24l4 6v24a2 2 0 01-2 2H6a2 2 0 01-2-2V11l4-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M14 5v10h12V5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 24h16M12 29h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 570, color: 'var(--fg-2)', marginBottom: 4 }}>
              No saved assets
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              Generate a campaign from a gate and click<br/>
              <strong style={{ color: 'var(--fg-2)' }}>Save</strong> on each channel to find it here.
            </div>
          </div>
        </div>
      )}

      {/* Asset grid */}
      {savedAssets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {savedAssets.map(item => {
            const gateStyle = GATE_COLORS[item.gate] ?? { color: '#6B7280', bg: '#F9FAFB' };
            const chStyle = CHANNEL_COLORS[item.channel] ?? { color: '#6B7280', bg: '#F9FAFB' };
            const preview = getPreview(item.asset);
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  background: 'var(--bg-1)', border: '1px solid var(--border-1)',
                  borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                  cursor: 'pointer', transition: 'box-shadow 0.15s',
                  display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Channel header band */}
                <div style={{
                  background: chStyle.bg, padding: '10px 14px',
                  borderBottom: '1px solid var(--border-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: chStyle.color }}>
                    {CHANNEL_ICONS[item.channel]}
                    <span style={{ fontSize: 12, fontWeight: 570 }}>
                      {CHANNEL_LABELS[item.channel] ?? item.channel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(item.savedAt)}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); removeAsset(item.id); if (selected?.id === item.id) setSelected(null); }}
                      title="Delete"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--fg-3)', padding: 2, display: 'flex', alignItems: 'center',
                        borderRadius: 4, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-3)')}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 3.5h9M5 3.5V2.5h3v1M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Gate + Segment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 570, color: gateStyle.color,
                      background: gateStyle.bg, padding: '1px 6px',
                      borderRadius: 'var(--radius-full)', letterSpacing: '0.05em', flexShrink: 0,
                    }}>
                      {item.gateLabel.toUpperCase()}
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.segmentColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--fg-2)', fontWeight: 570, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.segmentName}
                    </span>
                  </div>

                  {/* Content preview */}
                  {preview && (
                    <div style={{
                      fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {preview}
                    </div>
                  )}

                  {/* CTA */}
                  <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 570 }}>
                    View details →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px', overflowY: 'auto' }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: 'var(--bg-1)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 580, border: '1px solid var(--border-1)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 570,
                    color: (GATE_COLORS[selected.gate] ?? GATE_COLORS.gate0).color,
                    background: (GATE_COLORS[selected.gate] ?? GATE_COLORS.gate0).bg,
                    padding: '1px 6px', borderRadius: 'var(--radius-full)', letterSpacing: '0.05em',
                  }}>
                    {selected.gateLabel.toUpperCase()}
                  </span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: selected.segmentColor }} />
                  <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 570 }}>{selected.segmentName}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>· {formatTime(selected.savedAt)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: (CHANNEL_COLORS[selected.channel] ?? { color: '#6B7280' }).color }}>
                  {CHANNEL_ICONS[selected.channel]}
                  <span style={{ fontSize: 14, fontWeight: 570 }}>{CHANNEL_LABELS[selected.channel] ?? selected.channel}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 4, flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Asset content — éditable */}
            <div style={{ padding: '20px' }}>
              <AssetCard
                asset={selected.asset}
                isSaved={modalSaved}
                onSave={(editedAsset) => {
                  updateAsset(selected.id, editedAsset ?? selected.asset);
                  setModalSaved(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
