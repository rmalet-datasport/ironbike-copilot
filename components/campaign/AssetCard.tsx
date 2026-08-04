'use client';

import { useState, useEffect } from 'react';

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

interface AssetCardProps {
  asset: Asset;
  onRegenerate?: (channel: string, instructions: string) => void;
  isRegenerating?: boolean;
  onSave?: (editedAsset?: Asset) => void;
  isSaved?: boolean;
}

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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3.5" y="3.5" width="7" height="4" rx="0.5" fill="currentColor" opacity="0.25"/>
    </svg>
  ),
  story: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
      <rect x="1.5" y="0.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3" y="2" width="8" height="4.5" rx="0.5" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  newsletter: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 5.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
};

const VISUAL_DIRECTION_LABELS: Record<string, string> = {
  typo: 'Typo',
  foto: 'Foto',
  ki_illustration: 'KI-Illustration',
};

export default function AssetCard({ asset, onRegenerate, isRegenerating, onSave, isSaved }: AssetCardProps) {
  const [showRegen, setShowRegen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [editedAsset, setEditedAsset] = useState<Asset>({ ...asset });

  useEffect(() => {
    setEditedAsset({ ...asset });
  }, [asset.copy, asset.cta, asset.editionNumber, asset.dataPoint, asset.sentence, asset.stickerLink, asset.subject, asset.preheader, asset.body, asset.meta]);

  const setField = (field: keyof Asset, value: string) =>
    setEditedAsset(prev => ({ ...prev, [field]: value }));

  const style = CHANNEL_COLORS[asset.channel] ?? { color: '#6B7280', bg: '#F9FAFB' };

  const handleSubmitRegen = () => {
    if (!instructions.trim() || !onRegenerate) return;
    onRegenerate(asset.channel, instructions);
    setShowRegen(false);
    setInstructions('');
  };

  return (
    <div style={{ border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-1)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: style.bg, borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: style.color }}>
          {CHANNEL_ICONS[asset.channel]}
          <span style={{ fontSize: 12, fontWeight: 570 }}>{CHANNEL_LABELS[asset.channel] ?? asset.channel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onSave && (
            <button
              onClick={() => onSave(editedAsset)}
              disabled={isSaved}
              title={isSaved ? 'Saved' : 'Save this asset'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${isSaved ? style.color : 'var(--border-1)'}`,
                background: isSaved ? style.bg : 'var(--bg-1)',
                color: isSaved ? style.color : 'var(--fg-2)',
                fontSize: 11, cursor: isSaved ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isSaved ? (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 6l3 3 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 1.5h7l1 1.5v6.5l-3.5-2L3 9.5V3l-1-1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              )}
              {isSaved ? 'Saved' : 'Save'}
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={() => setShowRegen(!showRegen)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-2)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M9.5 2A5 5 0 102 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9.5 2v3h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <style>{`
          .sparta-editable-line {
            border: 1px solid transparent;
            border-radius: 3px;
            background: transparent;
            outline: none;
            padding: 2px 5px;
            margin: -2px -5px;
            font-family: var(--font-sans);
            color: var(--fg-1);
            width: calc(100% + 10px);
            display: block;
            transition: border-color 0.12s, background-color 0.12s;
            box-sizing: border-box;
          }
          .sparta-editable-line:hover { background-color: var(--bg-2); border-color: var(--border-1); }
          .sparta-editable-line:focus { background-color: var(--bg-1); border-color: var(--color-grey-400, #9CA3AF); }
          .sparta-editable-area {
            border: 1px solid transparent;
            border-radius: 3px;
            background: transparent;
            outline: none;
            padding: 2px 5px;
            margin: -2px -5px;
            font-family: var(--font-sans);
            color: var(--fg-1);
            width: calc(100% + 10px);
            display: block;
            resize: none;
            overflow: hidden;
            transition: border-color 0.12s, background-color 0.12s;
            box-sizing: border-box;
          }
          .sparta-editable-area:hover { background-color: var(--bg-2); border-color: var(--border-1); }
          .sparta-editable-area:focus { background-color: var(--bg-1); border-color: var(--color-grey-400, #9CA3AF); }
        `}</style>

        {/* feed_post */}
        {asset.channel === 'feed_post' && (
          <>
            {editedAsset.copy !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Copy</div>
                <textarea
                  className="sparta-editable-area"
                  value={editedAsset.copy ?? ''}
                  onChange={e => { setField('copy', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  rows={Math.max(3, (editedAsset.copy ?? '').split('\n').length)}
                  style={{ fontSize: 13, lineHeight: 1.6 }}
                />
              </div>
            )}
            {editedAsset.cta !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>CTA</div>
                <input
                  className="sparta-editable-line"
                  value={editedAsset.cta ?? ''}
                  onChange={e => setField('cta', e.target.value)}
                  style={{ fontSize: 12, fontWeight: 570, color: style.color }}
                />
              </div>
            )}
            {asset.visualDirection && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-full)', fontSize: 11, color: 'var(--fg-2)' }}>
                Visual: {VISUAL_DIRECTION_LABELS[asset.visualDirection] ?? asset.visualDirection}
              </div>
            )}
          </>
        )}

        {/* story */}
        {asset.channel === 'story' && (
          <>
            {editedAsset.editionNumber !== undefined && editedAsset.editionNumber !== '' && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Edition</div>
                <input
                  className="sparta-editable-line"
                  value={editedAsset.editionNumber ?? ''}
                  onChange={e => setField('editionNumber', e.target.value)}
                  style={{ fontSize: 12, color: 'var(--fg-2)' }}
                />
              </div>
            )}
            {editedAsset.dataPoint !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Data point</div>
                <input
                  className="sparta-editable-line"
                  value={editedAsset.dataPoint ?? ''}
                  onChange={e => setField('dataPoint', e.target.value)}
                  style={{ fontSize: 20, fontWeight: 570, fontFamily: 'var(--font-mono)', color: style.color }}
                />
              </div>
            )}
            {editedAsset.sentence !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Sentence</div>
                <textarea
                  className="sparta-editable-area"
                  value={editedAsset.sentence ?? ''}
                  onChange={e => { setField('sentence', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  rows={Math.max(2, (editedAsset.sentence ?? '').split('\n').length)}
                  style={{ fontSize: 13, lineHeight: 1.6 }}
                />
              </div>
            )}
            {editedAsset.stickerLink !== undefined && editedAsset.stickerLink !== '' && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Sticker link</div>
                <input
                  className="sparta-editable-line"
                  value={editedAsset.stickerLink ?? ''}
                  onChange={e => setField('stickerLink', e.target.value)}
                  style={{ fontSize: 12, color: style.color }}
                />
              </div>
            )}
          </>
        )}

        {/* newsletter */}
        {asset.channel === 'newsletter' && (
          <>
            {editedAsset.subject !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Subject</div>
                <input
                  className="sparta-editable-line"
                  value={editedAsset.subject ?? ''}
                  onChange={e => setField('subject', e.target.value)}
                  style={{ fontSize: 13, fontWeight: 570 }}
                />
              </div>
            )}
            {editedAsset.preheader !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Preheader</div>
                <input
                  className="sparta-editable-line"
                  value={editedAsset.preheader ?? ''}
                  onChange={e => setField('preheader', e.target.value)}
                  style={{ fontSize: 12, color: 'var(--fg-3)' }}
                />
              </div>
            )}
            {editedAsset.body !== undefined && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Body</div>
                <textarea
                  className="sparta-editable-area"
                  value={editedAsset.body ?? ''}
                  onChange={e => { setField('body', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  rows={Math.max(3, (editedAsset.body ?? '').split('\n').length)}
                  style={{ fontSize: 12, lineHeight: 1.6 }}
                />
              </div>
            )}
            {asset.personalizationFields && asset.personalizationFields.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {asset.personalizationFields.map(f => (
                  <span key={f} style={{ fontSize: 11, color: style.color, background: style.bg, border: `1px solid ${style.color}33`, borderRadius: 'var(--radius-full)', padding: '2px 8px' }}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {editedAsset.meta && (
          <div style={{ marginTop: 12, padding: '6px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>
            {editedAsset.meta}
          </div>
        )}
      </div>

      {/* Regenerate panel */}
      {showRegen && onRegenerate && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder={`Custom instructions for ${CHANNEL_LABELS[asset.channel] ?? asset.channel}...`}
            rows={2}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-1)', fontSize: 12, fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowRegen(false); setInstructions(''); }}
              style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-2)', fontSize: 12, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRegen}
              disabled={isRegenerating || !instructions.trim()}
              style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: isRegenerating ? 'var(--fg-3)' : 'var(--primary)', color: 'white', fontSize: 12, fontWeight: 570, cursor: isRegenerating ? 'not-allowed' : 'pointer' }}
            >
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
