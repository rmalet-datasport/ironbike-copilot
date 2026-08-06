'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useCampaignHistory } from '@/lib/context/CampaignHistoryContext';
import { useBrandHistory } from '@/lib/context/BrandHistoryContext';
import { useSidebar } from '@/lib/context/SidebarContext';
import { EVENT } from '@/lib/constants';

const GATES = [
  {
    id: 'creation',
    label: 'Ankündigung',
    sublabel: 'Phase 0',
    href: '/gate/creation',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M11.5 9v6M8.5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'registration',
    label: 'Anmeldephase',
    sublabel: 'Phase 1',
    href: '/gate/registration',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1.5 13c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M14.5 13c0-2.071-1.343-3.847-3.23-4.37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'lottery',
    label: 'Race Week',
    sublabel: 'Phase 2',
    href: '/gate/lottery',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="5.5" cy="5.5" r="1" fill="currentColor"/>
        <circle cx="10.5" cy="5.5" r="1" fill="currentColor"/>
        <circle cx="5.5" cy="10.5" r="1" fill="currentColor"/>
        <circle cx="10.5" cy="10.5" r="1" fill="currentColor"/>
        <circle cx="8" cy="8" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'finish',
    label: 'Renntag & danach',
    sublabel: 'Phase 3',
    href: '/gate/finish',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8h10M3 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { savedAssets } = useCampaignHistory();
  const { examples } = useBrandHistory();
  const { isOpen, close } = useSidebar();

  useEffect(() => { close(); }, [pathname]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`ironbike-overlay${isOpen ? ' visible' : ''}`}
        onClick={close}
      />
    <aside
      className={`ironbike-sidebar${isOpen ? ' open' : ''}`}
      style={{
        width: 224,
        minHeight: '100vh',
        background: 'var(--color-grey-900)',
        borderRight: '1px solid var(--color-grey-800)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 20px 0',
          borderBottom: '1px solid var(--color-grey-800)',
          paddingBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="34" height="32" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M5.90385 4.81055L14.4079 9.48282L5.88574 14.1983L5.90385 4.81055Z" fill="#F62121"/>
            <path d="M13.0957 2.29736C9.96215 0.570086 5.96824 -0.846278 3.35091 0.570086C0.733574 1.98645 0 6.04554 0 9.50009C0 12.9546 0.661122 16.9274 3.35091 18.4042C6.04069 19.881 9.98027 18.4474 13.1048 16.7201C16.2293 14.9928 19.5168 12.471 19.5168 9.50872C19.5168 6.54645 16.2202 4.02463 13.0957 2.29736ZM4.30184 2.16781C5.9773 1.25236 8.93877 2.116 12.1357 3.89509C15.3327 5.67418 17.5696 7.67781 17.5696 9.50872C17.5696 11.3396 15.3689 13.3605 12.1357 15.1483C8.90254 16.936 5.95012 17.7392 4.28372 16.8324C2.61733 15.9255 1.91998 13.0064 1.91998 9.50009C1.91998 5.99372 2.63544 3.08327 4.30184 2.16781Z" fill="#F62121"/>
          </svg>
          <div>
            <div style={{ color: 'var(--color-white)', fontWeight: 570, fontSize: 14, lineHeight: 1.2 }}>
              Iron Bike Co-Pilot
            </div>
            <div style={{ marginTop: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/datasport-logo.svg" alt="Datasport" style={{ height: 9, display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.4 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Event pill */}
      <div style={{ padding: '12px 16px' }}>
        <div
          style={{
            background: 'var(--color-grey-800)',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          <div style={{ color: 'var(--color-grey-400)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            Event
          </div>
          <div style={{ color: 'var(--color-white)', fontSize: 12, fontWeight: 570 }}>
            {EVENT.name}
          </div>
          <div style={{ color: 'var(--color-grey-500)', fontSize: 11, marginTop: 1 }}>
            {new Date(EVENT.raceDate).getFullYear()} · {new Date(EVENT.raceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 0' }}>
        <div style={{ padding: '4px 16px 8px', color: 'var(--color-grey-600)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Journeys
        </div>
        {GATES.map((gate) => {
          const isActive = pathname.startsWith(gate.href);
          return (
            <Link
              key={gate.id}
              href={gate.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                color: isActive ? 'var(--color-white)' : 'var(--color-grey-500)',
                background: isActive ? 'var(--color-grey-800)' : 'transparent',
                borderRadius: 6,
                margin: '1px 8px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              }}
            >
              <span style={{ color: isActive ? 'var(--primary)' : 'var(--color-grey-600)', flexShrink: 0 }}>
                {gate.icon}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: isActive ? 570 : 400, lineHeight: 1.3 }}>
                  {gate.label}
                </div>
                <div style={{ fontSize: 10, color: isActive ? 'var(--color-grey-400)' : 'var(--color-grey-600)', marginTop: 1 }}>
                  {gate.sublabel}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Campaigns */}
      <div style={{ padding: '8px 0', borderTop: '1px solid var(--color-grey-800)' }}>
        <div style={{ padding: '8px 16px 6px', color: 'var(--color-grey-600)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Campaigns
        </div>
        <Link
          href="/campaigns"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px',
            color: pathname === '/campaigns' ? 'var(--color-white)' : 'var(--color-grey-500)',
            background: pathname === '/campaigns' ? 'var(--color-grey-800)' : 'transparent',
            borderRadius: 6, margin: '1px 8px', textDecoration: 'none',
            transition: 'all 0.15s ease',
            borderLeft: pathname === '/campaigns' ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          <span style={{ color: pathname === '/campaigns' ? 'var(--primary)' : 'var(--color-grey-600)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h10l1.5 2.5v9a1 1 0 01-1 1H2.5a1 1 0 01-1-1V4.5L3 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5.5 2v4h5V2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M4.5 10h7M4.5 12.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: pathname === '/campaigns' ? 570 : 400, lineHeight: 1.3 }}>
                Saved
              </div>
            </div>
            {savedAssets.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 570, minWidth: 18, height: 18,
                background: 'var(--primary)', color: 'white',
                borderRadius: 'var(--radius-full)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '0 5px',
              }}>
                {savedAssets.length}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Brand Voice */}
      <div style={{ padding: '8px 0', borderTop: '1px solid var(--color-grey-800)' }}>
        <div style={{ padding: '8px 16px 6px', color: 'var(--color-grey-600)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Brand Voice
        </div>
        <Link
          href="/brand-voice"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px',
            color: pathname === '/brand-voice' ? 'var(--color-white)' : 'var(--color-grey-500)',
            background: pathname === '/brand-voice' ? 'var(--color-grey-800)' : 'transparent',
            borderRadius: 6, margin: '1px 8px', textDecoration: 'none',
            transition: 'all 0.15s ease',
            borderLeft: pathname === '/brand-voice' ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          <span style={{ color: pathname === '/brand-voice' ? 'var(--primary)' : 'var(--color-grey-600)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5.5 8c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="1" fill="currentColor"/>
            </svg>
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: pathname === '/brand-voice' ? 570 : 400, lineHeight: 1.3 }}>
              History
            </div>
            {examples.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 570, minWidth: 18, height: 18,
                background: '#16A34A', color: 'white',
                borderRadius: 'var(--radius-full)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '0 5px',
              }}>
                {examples.length}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-grey-800)',
          color: 'var(--color-grey-600)',
          fontSize: 11,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
          <span>claude-sonnet-4-6</span>
        </div>
      </div>
    </aside>
    </>
  );
}
