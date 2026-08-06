'use client';

import { useState, FormEvent } from 'react';

export default function AccessPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="120" height="28" viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Datasport">
            <text x="0" y="22" fontFamily="'Saans', sans-serif" fontWeight="570" fontSize="20" fill="white" letterSpacing="-0.5">datasport</text>
          </svg>
        </div>

        <h1 style={styles.title}>Iron Bike Co-Pilot</h1>
        <p style={styles.subtitle}>Demo access — enter the demo password to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            style={styles.input}
            onFocus={e => Object.assign(e.currentTarget.style, styles.inputFocus)}
            onBlur={e => Object.assign(e.currentTarget.style, styles.input)}
          />

          {error && (
            <p style={styles.error}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              ...styles.button,
              ...(loading || !password ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Checking...' : 'Access demo'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-grey-900)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--color-grey-800)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-grey-700)',
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0',
  },
  logo: {
    marginBottom: '28px',
  },
  title: {
    fontFamily: 'var(--font-sans)',
    fontWeight: 570,
    fontSize: '22px',
    color: 'var(--color-white)',
    margin: '0 0 8px 0',
    textAlign: 'center',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: '13px',
    color: 'var(--color-grey-400)',
    margin: '0 0 32px 0',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--color-grey-900)',
    border: '1px solid var(--color-grey-700)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-white)',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  inputFocus: {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--color-grey-900)',
    border: '1px solid var(--color-grey-500)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-white)',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  error: {
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    color: 'var(--color-red-700)',
    margin: '0',
  },
  button: {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--color-red-700)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-white)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 570,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  buttonDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
};
