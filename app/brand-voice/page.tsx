'use client';

import { useState, useRef } from 'react';
import { useBrandHistory } from '@/lib/context/BrandHistoryContext';

const GATE_LABELS: Record<string, string> = {
  gate0: 'Ankündigung',
  gate1: 'Anmeldephase',
  gate2: 'Race Week',
  gate3: 'Renntag & danach',
};

const CHANNEL_COLORS: Record<string, { color: string; bg: string }> = {
  email:     { color: '#2563EB', bg: '#EFF6FF' },
  sms:       { color: '#16A34A', bg: '#F0FDF4' },
  push:      { color: '#7C3AED', bg: '#F5F3FF' },
  instagram: { color: '#EA580C', bg: '#FFF7ED' },
};

const TEMPLATE_CSV = [
  'channel,gate,segment,subject,title,body,caption,hashtags',
  'newsletter,registration,reactivation_kernradius,Nach 30 Jahren ist Schluss,,We noticed you have been part of our journey for years. This year we want to make it official.,,',
  'feed_post,,,,,,"Ready to take on the Iron Bike Race Einsiedeln? Registration is open.","#IronBikeRace #Einsiedeln2026"',
  'story,lottery,,,,See you at the start line on 27 September.,,',
  ',,,,,Every finish line is a new beginning. Iron Bike Race Einsiedeln 2026 — are you ready?,,',
].join('\n');

const EXAMPLE_ROWS = [
  { channel: 'newsletter', gate: 'registration', segment: 'reactivation_kernradius', subject: 'Nach 30 Jahren ist Schluss', body: 'We noticed you have been part of our journey for years...' },
  { channel: 'feed_post',  gate: '',             segment: '',                       caption: 'Ready for the Iron Bike Race?', hashtags: '#IronBikeRace2026' },
  { channel: 'story',      gate: 'lottery',      segment: '',                       body: 'See you at the start line on 27 September.' },
  { channel: '',           gate: '',             segment: '',                       body: 'Every finish line is a new beginning.' },
];

export default function BrandVoicePage() {
  const { examples, fileName, uploadFile, clearExamples } = useBrandHistory();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    await uploadFile(file);
    setIsLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const channelCounts = examples.reduce<Record<string, number>>((acc, ex) => {
    const k = ex.channel ?? '__global__';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const gateCounts = examples.reduce<Record<string, number>>((acc, ex) => {
    const k = ex.gate ?? '__global__';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const globalCount = examples.filter(e => !e.channel && !e.gate && !e.segment).length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-2)', border: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2C5.134 2 2 5.134 2 9s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7z" stroke="var(--fg-3)" strokeWidth="1.4"/>
              <path d="M6 9c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3" stroke="var(--fg-2)" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="1.2" fill="var(--fg-1)"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 570, color: 'var(--fg-1)', margin: 0 }}>Brand Voice</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
          Teach Iron Bike Co-Pilot your communication style. By uploading your past campaigns,
          every new generation will automatically align with your brand voice.
        </p>
      </div>

      {/* Loaded state */}
      {fileName && examples.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* File banner */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#DCFCE7', border: '1px solid #BBF7D0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2.5 8l4 4 7-7" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 570, color: '#15803D' }}>{fileName}</div>
                <div style={{ fontSize: 11, color: '#16A34A', marginTop: 1 }}>
                  {examples.length} example{examples.length > 1 ? 's' : ''} loaded · active for all generations
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid #BBF7D0', background: 'white',
                  color: '#16A34A', fontSize: 12, cursor: 'pointer',
                }}
              >
                Replace
              </button>
              <button
                onClick={clearExamples}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-1)', background: 'white',
                  color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* By channel */}
            <div style={{ padding: '16px 18px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-1)' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                By channel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(channelCounts)
                  .filter(([k]) => k !== '__global__')
                  .map(([ch, count]) => {
                    const style = CHANNEL_COLORS[ch] ?? { color: '#6B7280', bg: '#F9FAFB' };
                    return (
                      <div key={ch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 570, textTransform: 'capitalize',
                          padding: '2px 7px', borderRadius: 'var(--radius-full)',
                          background: style.bg, color: style.color,
                        }}>
                          {ch}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 570 }}>{count}</span>
                      </div>
                    );
                  })}
                {(channelCounts['__global__'] ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Global (all channels)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 570 }}>{channelCounts['__global__']}</span>
                  </div>
                )}
                {Object.keys(channelCounts).filter(k => k !== '__global__').length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>All global</span>
                )}
              </div>
            </div>

            {/* By gate */}
            <div style={{ padding: '16px 18px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-1)' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                By gate
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(gateCounts)
                  .filter(([k]) => k !== '__global__')
                  .map(([gate, count]) => (
                    <div key={gate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                        {GATE_LABELS[gate] ?? gate}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 570 }}>{count}</span>
                    </div>
                  ))}
                {(gateCounts['__global__'] ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Global (all gates)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 570 }}>{gateCounts['__global__']}</span>
                  </div>
                )}
                {globalCount > 0 && gateCounts['__global__'] !== globalCount && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>No context</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 570 }}>{globalCount}</span>
                  </div>
                )}
                {Object.keys(gateCounts).filter(k => k !== '__global__').length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>All global</span>
                )}
              </div>
            </div>
          </div>

          {/* How examples are used */}
          <div style={{ padding: '16px 18px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-2)' }}>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--fg-1)' }}>How Iron Bike Co-Pilot uses these examples</strong>
              <br />
              At each generation, Iron Bike Co-Pilot automatically selects the most relevant examples for the active gate and segment.
              Highly specific examples (channel + gate + segment) take priority over global ones.
              Up to 6 examples are injected into the prompt to guide the tone, style and structure of the generated assets.
            </div>
          </div>

        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* How it works */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 570, color: 'var(--fg-1)', marginBottom: 14, marginTop: 0 }}>
              How it works
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                {
                  num: '1',
                  title: 'Export your campaigns',
                  desc: 'Retrieve your past emails, SMS or Instagram posts from your marketing tool.',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M6 3V2M12 3V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M5 9h8M5 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  ),
                },
                {
                  num: '2',
                  title: 'Structure in Excel or CSV',
                  desc: 'Put the texts in a file with the columns described below. Takes 5 minutes.',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M2 7h14M7 7v9" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  ),
                },
                {
                  num: '3',
                  title: 'Iron Bike Co-Pilot adopts your style',
                  desc: 'At each generation, relevant examples are automatically injected into the prompt.',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2C5.134 2 2 5.134 2 9s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7z" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M6.5 9.5L8.5 11.5L12 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--fg-2)', flexShrink: 0,
                    }}>
                      {step.icon}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 570, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Step {step.num}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 570, color: 'var(--fg-1)', marginBottom: 5 }}>{step.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.55 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 570, color: 'var(--fg-1)', margin: 0 }}>
                File format
              </h2>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
                download="brand-voice-template.csv"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-1)', background: 'var(--bg-1)',
                  color: 'var(--fg-2)', fontSize: 11, textDecoration: 'none',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1.5v5M3.5 5l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.5 8.5v1a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Download template
              </a>
            </div>

            <div style={{ border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-1)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border-1)' }}>
                      {['channel', 'gate', 'segment', 'subject', 'body / caption', 'hashtags'].map((col, i) => (
                        <th key={col} style={{
                          padding: '8px 12px', textAlign: 'left', fontWeight: 570,
                          color: i < 3 ? 'var(--fg-3)' : 'var(--fg-2)',
                          whiteSpace: 'nowrap',
                          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {col}
                          {i < 3 && (
                            <span style={{
                              marginLeft: 4, fontSize: 9, fontWeight: 400,
                              color: 'var(--fg-3)', background: 'var(--border-1)',
                              padding: '1px 4px', borderRadius: 3,
                            }}>
                              optional
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EXAMPLE_ROWS.map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < EXAMPLE_ROWS.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                          {row.channel ? (
                            <span style={{
                              fontSize: 10, fontWeight: 570, textTransform: 'capitalize',
                              padding: '2px 6px', borderRadius: 'var(--radius-full)',
                              background: (CHANNEL_COLORS[row.channel] ?? { bg: '#F9FAFB' }).bg,
                              color: (CHANNEL_COLORS[row.channel] ?? { color: '#6B7280' }).color,
                            }}>
                              {row.channel}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', color: row.gate ? 'var(--fg-2)' : 'var(--fg-3)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {row.gate ? (GATE_LABELS['gate' + (row.gate === 'registration' ? '1' : row.gate === 'lottery' ? '2' : '0')] ?? row.gate) : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', color: row.segment ? 'var(--fg-2)' : 'var(--fg-3)', fontSize: 11 }}>
                          {row.segment || '—'}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--fg-1)', fontSize: 11, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(row as any).subject ?? (row as any).caption ?? (row as any).body ?? '—'}
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--fg-2)', fontSize: 11, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(row as any).hashtags ?? ((row as any).body && !(row as any).subject && !(row as any).caption ? (row as any).body : '—')}
                        </td>
                        <td style={{ padding: '9px 12px', color: (row as any).hashtags ? 'var(--fg-2)' : 'var(--fg-3)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {(row as any).hashtags ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
                <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                  The <strong style={{ color: 'var(--fg-2)' }}>channel</strong>, <strong style={{ color: 'var(--fg-2)' }}>gate</strong> and <strong style={{ color: 'var(--fg-2)' }}>segment</strong> columns are optional — a row without these columns applies to all contexts.
                  Column names are recognised in both French and English.
                </span>
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 570, color: 'var(--fg-1)', marginBottom: 14, marginTop: 0 }}>
              Upload your history
            </h2>
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-1)'}`,
                borderRadius: 'var(--radius-lg)',
                background: isDragging ? '#FFF5F5' : 'var(--bg-2)',
                padding: '40px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '2px solid var(--border-1)',
                    borderTopColor: 'var(--primary)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>Analyzing file…</div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'var(--bg-1)', border: '1px solid var(--border-1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--fg-3)',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M11 3v12M7 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 17v1.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 570, color: 'var(--fg-1)', marginBottom: 4 }}>
                      Drop your file here
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                      or click to browse · Excel (.xlsx) or CSV (.csv)
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
