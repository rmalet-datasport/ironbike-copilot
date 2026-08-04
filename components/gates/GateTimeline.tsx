'use client';

import Link from 'next/link';

const GATES = [
  { id: 'creation', label: 'Ankündigung', sub: 'Phase 0', href: '/gate/creation' },
  { id: 'registration', label: 'Anmeldephase', sub: 'Phase 1', href: '/gate/registration' },
  { id: 'lottery', label: 'Race Week', sub: 'Phase 2', href: '/gate/lottery' },
  { id: 'finish', label: 'Renntag & danach', sub: 'Phase 3', href: '/gate/finish' },
];

interface Props {
  activeGate: 'creation' | 'registration' | 'lottery' | 'finish';
}

export default function GateTimeline({ activeGate }: Props) {
  const activeIdx = GATES.findIndex(g => g.id === activeGate);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '20px 0 4px' }}>
      {GATES.map((gate, idx) => {
        const isActive = gate.id === activeGate;
        const isPast = idx < activeIdx;
        const isLast = idx === GATES.length - 1;

        return (
          <div key={gate.id} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
            <Link href={gate.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* Circle */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'var(--primary)' : isPast ? 'var(--color-grey-200)' : 'var(--bg-1)',
                  border: isActive ? '2px solid var(--primary)' : isPast ? '2px solid var(--color-grey-200)' : '2px solid var(--border-1)',
                  color: isActive ? 'white' : isPast ? 'var(--fg-3)' : 'var(--fg-3)',
                  fontSize: 12,
                  fontWeight: 570,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                {isPast ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : idx}
              </div>
              {/* Labels */}
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 1 }}>{gate.sub}</div>
                <div style={{ fontSize: 12, fontWeight: isActive ? 570 : 400, color: isActive ? 'var(--fg-1)' : 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                  {gate.label}
                </div>
              </div>
            </Link>

            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isPast ? 'var(--color-grey-300)' : 'var(--border-1)',
                  margin: '0 4px',
                  marginBottom: 28,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
