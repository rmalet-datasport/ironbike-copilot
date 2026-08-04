'use client';

import type { Channel } from '@/lib/constants';
import { CHANNELS, CHANNEL_LABELS } from '@/lib/constants';

interface ChannelSelectorProps {
  available: Channel[];
  selected: Channel[];
  onChange: (channels: Channel[]) => void;
  rationale?: Partial<Record<Channel, string>>;
}

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  feed_post: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3.5" y="3.5" width="7" height="4" rx="0.5" fill="currentColor" opacity="0.25"/>
      <path d="M3.5 9.5h5M3.5 11h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  story: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
      <rect x="1.5" y="0.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3" y="2" width="8" height="4.5" rx="0.5" fill="currentColor" opacity="0.3"/>
      <path d="M3 8h8M3 9.5h5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  newsletter: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 5.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
};

export default function ChannelSelector({ available, selected, onChange, rationale }: ChannelSelectorProps) {
  const toggle = (ch: Channel) => {
    if (selected.includes(ch)) {
      onChange(selected.filter(c => c !== ch));
    } else {
      onChange([...selected, ch]);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 570, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Channels
        </div>
        {available.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            recommended: {available.map(ch => CHANNEL_LABELS[ch]).join(', ')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CHANNELS.map(ch => {
          const isRecommended = available.includes(ch);
          const isSelected = selected.includes(ch);

          return (
            <button
              key={ch}
              onClick={() => toggle(ch)}
              title={rationale?.[ch]}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-1)'}`,
                background: isSelected ? '#FFF0F2' : 'var(--bg-1)',
                color: isSelected ? 'var(--primary)' : 'var(--fg-1)',
                fontSize: 12,
                fontWeight: isSelected ? 570 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {CHANNEL_ICONS[ch]}
              {CHANNEL_LABELS[ch]}
              {isRecommended && !isSelected && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', opacity: 0.5, flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
      {rationale && selected.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {selected.filter(ch => rationale[ch]).map(ch => (
            <p key={ch} style={{ fontSize: 11, color: 'var(--fg-3)', margin: '3px 0', display: 'flex', gap: 5 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 570 }}>{CHANNEL_LABELS[ch]}:</span>
              {rationale[ch]}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
