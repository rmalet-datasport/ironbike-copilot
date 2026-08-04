'use client';

import { useState } from 'react';
import AssetCard from './AssetCard';
import { useCampaignHistory } from '@/lib/context/CampaignHistoryContext';
import { useBrandHistory } from '@/lib/context/BrandHistoryContext';
import { CATEGORIES, SIBLING_EVENTS, type Category, type SiblingEvent } from '@/lib/constants';

interface Asset {
  channel: string;
  copy?: string;
  cta?: string;
  visualDirection?: string;
  editionNumber?: string;
  dataPoint?: string;
  sentence?: string;
  stickerLink?: string;
  subject?: string;
  preheader?: string;
  body?: string;
  personalizationFields?: string[];
  meta?: string;
}

interface CampaignGeneratorProps {
  gate: string;
  segment: string;
  channels: string[];
  segmentSize?: number;
  segmentDescription?: string;
  segmentName?: string;
  segmentColor?: string;
  segmentColorBg?: string;
  gateLabel?: string;
  promoMode?: 'categories' | 'siblingEvents';
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'white',
            animation: `dotBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
            display: 'inline-block',
          }}
        />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

export default function CampaignGenerator({ gate, segment, channels, segmentSize, segmentDescription, segmentName, segmentColor, segmentColorBg, gateLabel, promoMode = 'categories' }: CampaignGeneratorProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [regenChannel, setRegenChannel] = useState<string | null>(null);
  const [savedChannels, setSavedChannels] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedSiblingEvents, setSelectedSiblingEvents] = useState<SiblingEvent[]>([]);
  const { saveAsset } = useCampaignHistory();
  const { getRelevantExamples } = useBrandHistory();

  const generate = async (opts?: { channelToRegenerate?: string; customPrompt?: string }) => {
    if (channels.length === 0 && !opts?.channelToRegenerate) return;

    setStatus('generating');
    setError(null);
    setSavedChannels(new Set());

    const historicalExamples = getRelevantExamples({ gate, segment });

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate,
          segment,
          channels: opts?.channelToRegenerate ? [opts.channelToRegenerate] : channels,
          customInstructions: opts?.customPrompt ?? customInstructions,
          channelToRegenerate: opts?.channelToRegenerate,
          segmentDescription,
          segmentSize,
          historicalExamples,
          selectedCategories,
          selectedSiblingEvents,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }

      const parsed = JSON.parse(text);
      const newAssets: Asset[] = parsed.assets ?? [];

      if (opts?.channelToRegenerate) {
        setAssets(prev => prev.map(a => a.channel === opts.channelToRegenerate ? (newAssets[0] ?? a) : a));
      } else {
        setAssets(newAssets);
      }
      setStatus('done');
    } catch (err) {
      console.error(err);
      setError('Generation failed. Please check your API key and try again.');
      setStatus('error');
    }
  };

  const handleRegenerate = async (channel: string, instructions: string) => {
    setRegenChannel(channel);
    setSavedChannels(prev => { const s = new Set(prev); s.delete(channel); return s; });
    await generate({ channelToRegenerate: channel, customPrompt: instructions });
    setRegenChannel(null);
  };

  if (channels.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
        Select at least one channel to generate a campaign.
      </div>
    );
  }

  return (
    <div>
      {/* Custom instructions */}
      {status !== 'generating' && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder="Optional: Add custom instructions (tone, focus, specific offers...)"
            rows={2}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-1)',
              background: 'var(--bg-1)',
              color: 'var(--fg-1)',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
        </div>
      )}

      {/* Historical examples indicator */}
      {(() => {
        const count = getRelevantExamples({ gate, segment }).length;
        if (count === 0) return null;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', marginBottom: 12,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-2)',
            border: '1px solid var(--border-1)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--fg-3)', flexShrink: 0 }}>
              <ellipse cx="6" cy="3" rx="4" ry="1.5" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M2 3v3c0 .828 1.79 1.5 4 1.5S10 6.828 10 6V3" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M2 6v3c0 .828 1.79 1.5 4 1.5S10 9.828 10 9V6" stroke="currentColor" strokeWidth="1.1"/>
            </svg>
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
              <span style={{ fontWeight: 570, color: 'var(--fg-2)' }}>{count}</span>
              {' '}historical example{count > 1 ? 's' : ''} active for this context
            </span>
          </div>
        );
      })()}

      {/* Promotion selector — categories (gate 0-2) or sibling events cross-sell (gate 3) */}
      {status !== 'generating' && promoMode === 'categories' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 570, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Promote categories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => {
              const checked = selectedCategories.some(c => c.id === cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategories(prev =>
                    checked ? prev.filter(c => c.id !== cat.id) : [...prev, cat]
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border-1)'}`,
                    background: checked ? 'color-mix(in srgb, var(--primary) 8%, var(--bg-1))' : 'var(--bg-1)',
                    color: checked ? 'var(--primary)' : 'var(--fg-2)',
                    fontSize: 12,
                    fontWeight: checked ? 570 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 3,
                    border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--fg-3)'}`,
                    background: checked ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s ease',
                  }}>
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {cat.label}
                </button>
              );
            })}
          </div>
          {selectedCategories.length > 1 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>
              Multi-category selection — campaign will use a broader message covering all selected categories.
            </div>
          )}
        </div>
      )}

      {status !== 'generating' && promoMode === 'siblingEvents' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 570, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Cross-sell — other Bike Marathon Classics
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SIBLING_EVENTS.map(ev => {
              const checked = selectedSiblingEvents.some(e => e.id === ev.id);
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedSiblingEvents(prev =>
                    checked ? prev.filter(e => e.id !== ev.id) : [...prev, ev]
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border-1)'}`,
                    background: checked ? 'color-mix(in srgb, var(--primary) 8%, var(--bg-1))' : 'var(--bg-1)',
                    color: checked ? 'var(--primary)' : 'var(--fg-2)',
                    fontSize: 12,
                    fontWeight: checked ? 570 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 3,
                    border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--fg-3)'}`,
                    background: checked ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s ease',
                  }}>
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {ev.name}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>
            Nothing checked by default — cross-sell is optional (decision D of the campaign concept).
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={() => generate()}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '11px 20px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: status === 'generating' ? 'var(--color-grey-700)' : 'var(--primary)',
          color: 'white',
          fontSize: 13,
          fontWeight: 570,
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.15s ease',
          marginBottom: 20,
        }}
      >
        {status === 'generating' ? (
          <>Generating campaign <LoadingDots /></>
        ) : status === 'done' ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2A5 5 0 102 9.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M9.5 2v3h-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Regenerate Campaign
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Generate Campaign
          </>
        )}
      </button>

      {/* Error */}
      {status === 'error' && error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Assets */}
      {assets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assets.map(asset => (
            <AssetCard
              key={asset.channel}
              asset={asset}
              onRegenerate={handleRegenerate}
              isRegenerating={regenChannel === asset.channel}
              isSaved={savedChannels.has(asset.channel)}
              onSave={(editedAsset?: Asset) => {
                saveAsset({
                  gate,
                  gateLabel: gateLabel ?? gate,
                  segmentId: segment,
                  segmentName: segmentName ?? segment,
                  segmentColor: segmentColor ?? '#6B7280',
                  segmentColorBg: segmentColorBg ?? '#F9FAFB',
                  channel: asset.channel,
                  asset: editedAsset ?? asset,
                });
                setSavedChannels(prev => new Set([...prev, asset.channel]));
              }}
            />
          ))}

          {/* Approve button */}
          <button
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-1)',
              background: 'var(--bg-1)',
              color: 'var(--fg-2)',
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Approve & Schedule
          </button>
        </div>
      )}
    </div>
  );
}
