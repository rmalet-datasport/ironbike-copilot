'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/context/SidebarContext';
import { EVENT } from '@/lib/constants';

const GATE_LABELS: Record<string, { gate: string; label: string }> = {
  '/gate/creation': { gate: 'Phase 0', label: 'Ankündigung' },
  '/gate/registration': { gate: 'Phase 1', label: 'Anmeldephase' },
  '/gate/lottery': { gate: 'Phase 2', label: 'Race Week' },
  '/gate/finish': { gate: 'Phase 3', label: 'Renntag & danach' },
};

export default function Topbar() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const current = Object.entries(GATE_LABELS).find(([path]) => pathname.startsWith(path));
  const gateInfo = current?.[1];

  return (
    <header
      style={{
        height: 52,
        borderBottom: '1px solid var(--border-1)',
        background: 'var(--bg-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        gap: 12,
      }}
    >
      {/* Hamburger — mobile only */}
      <button className="ironbike-hamburger" onClick={toggle} aria-label="Toggle menu">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ color: 'var(--fg-3)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{EVENT.name} {EVENT.raceDate.slice(0, 4)}</span>
        {gateInfo && (
          <>
            <span style={{ color: 'var(--border-2)', fontSize: 13 }}>/</span>
            <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>{gateInfo.gate}</span>
            <span style={{ color: 'var(--border-2)', fontSize: 13 }}>/</span>
            <span style={{ color: 'var(--fg-1)', fontSize: 13, fontWeight: 570 }}>{gateInfo.label}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Live badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#16A34A',
              animation: 'pulse 2s infinite',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 570, color: '#15803D', letterSpacing: '0.05em' }}>
            LIVE
          </span>
        </div>

        {/* Datasport logo text */}
        <div style={{ color: 'var(--fg-3)', fontSize: 12 }}>
          Datasport
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  );
}
