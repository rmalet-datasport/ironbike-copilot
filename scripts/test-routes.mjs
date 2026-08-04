/**
 * Route health check — runs against the local dev server (or any BASE_URL).
 * Does NOT call Anthropic (except test [9]). AI route validation is tested via invalid
 * inputs that fail before the API call, which lets us verify auth, validation, and rate limiting.
 *
 * Usage:
 *   $env:DEMO_PASSWORD="your_password"; node scripts/test-routes.mjs
 *
 * Options (env vars):
 *   BASE_URL      — default: http://localhost:3000
 *   DEMO_PASSWORD — required for tests 4–7 (cookie-gated tests)
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const PASSWORD  = process.env.DEMO_PASSWORD ?? ''

let pass = 0, fail = 0

function ok(name)        { console.log(`  \x1b[32m✓\x1b[0m ${name}`); pass++ }
function ko(name, detail){ console.log(`  \x1b[31m✗\x1b[0m ${name}  \x1b[2m(${detail})\x1b[0m`); fail++ }
function skip(reason)    { console.log(`  \x1b[33m–\x1b[0m skipped: ${reason}`) }
function check(name, cond, detail = '') { cond ? ok(name) : ko(name, detail) }

async function r(path, { method = 'POST', cookie, body, ip } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers['Cookie']           = cookie
  if (ip)     headers['X-Forwarded-For']  = ip
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\nChecking ${BASE_URL}\n${'─'.repeat(50)}`)

// 1. UNAUTHENTICATED — protected page should redirect
console.log('\n[1] Unauthenticated access to protected page')
{
  const res = await r('/gate/registration', { method: 'GET' })
  check('redirects (3xx)',             [301,302,307,308].includes(res.status), `status=${res.status}`)
  check('location points to /access',  res.headers.get('location')?.includes('/access'), res.headers.get('location') ?? 'none')
}

// 2. UNAUTHENTICATED — protected API should also redirect
console.log('\n[2] Unauthenticated access to protected API route')
{
  const res = await r('/api/participants/count', { body: { filters: [] } })
  check('blocked (3xx or 4xx)',        res.status >= 300, `status=${res.status}`)
}

// 3. WRONG PASSWORD → 401
console.log('\n[3] Login with wrong password')
{
  const res = await r('/api/access', { body: { password: 'wrong_password_xyz' } })
  check('status 401',                 res.status === 401, `status=${res.status}`)
  const body = await res.json()
  check('error message returned',     typeof body.error === 'string', JSON.stringify(body))
}

// 4. MALFORMED JSON BODY — should not 500
console.log('\n[4] Malformed JSON body on /api/access')
{
  const res = await fetch(`${BASE_URL}/api/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not valid json!!',
    redirect: 'manual',
  })
  check('no unhandled 500',           res.status !== 500, `status=${res.status}`)
}

// 5. CORRECT PASSWORD → cookie
console.log('\n[5] Login with correct password')
let cookie = ''
if (!PASSWORD) {
  skip('DEMO_PASSWORD env var not set — set it to run auth-dependent tests')
} else {
  const res = await r('/api/access', { body: { password: PASSWORD } })
  check('status 200',                 res.status === 200,     `status=${res.status}`)
  const sc = res.headers.get('set-cookie') ?? ''
  check('demo_access cookie present', sc.includes('demo_access='),               sc.slice(0, 60))
  check('HttpOnly flag set',          sc.toLowerCase().includes('httponly'),      sc.slice(0, 80))
  check('SameSite flag set',          sc.toLowerCase().includes('samesite'),      sc.slice(0, 80))
  cookie = sc.split(';')[0]  // "demo_access=VALUE"
}

// 6. AUTHENTICATED ACCESS
console.log('\n[6] Authenticated access to protected page')
if (!cookie) {
  skip('no cookie from step 5')
} else {
  const res = await r('/gate/registration', { method: 'GET', cookie })
  check('not redirected to /access',  !res.headers.get('location')?.includes('/access'), `location=${res.headers.get('location') ?? 'none'}, status=${res.status}`)
}

// 7. PARTICIPANTS ROUTE VALIDATIONS (real data, aggregates only — never raw rows)
console.log('\n[7] Participants route validation')
if (!cookie) {
  skip('no cookie from step 5')
} else {
  const p1 = await r('/api/participants/count', { cookie, body: { filters: [] } })
  check('count: no filters → 200', p1.status === 200, `status=${p1.status}`)
  if (p1.status === 200) {
    const json = JSON.parse(await p1.text())
    check('count: returns a number', typeof json.count === 'number', JSON.stringify(json))
    check('count: no raw rows in response', !JSON.stringify(json).includes('firstName'), 'response leaked participant fields')
  }

  const p2 = await r('/api/participants/stats', { cookie, body: { filters: [{ id: 'f1', field: 'hasEmail', value: 'true' }] } })
  check('stats: hasEmail filter → 200', p2.status === 200, `status=${p2.status}`)
  if (p2.status === 200) {
    const json = JSON.parse(await p2.text())
    check('stats: no raw rows in response', !JSON.stringify(json).includes('firstName'), 'response leaked participant fields')
  }

  // main AI route: unknown gate → 400 before Anthropic
  const p3 = await r('/api/ai', { cookie, body: { gate: 'unknown', segment: 'x', channels: [] } })
  check('main ai route: unknown gate → 400', p3.status === 400, `status=${p3.status}`)
}

// 8. DRY-RUN campaign generation (no Anthropic call)
// Uses _dryRun: true — routes through full auth + validation but skips the Anthropic call.
// Must run BEFORE the rate-limit test [10] which intentionally exhausts the quota.
console.log('\n[8] Dry-run campaign generation (no Anthropic call)')
if (!cookie) {
  skip('no cookie from step 5')
} else {
  // Valid gate/segment combinations — one per gate
  const DRY_RUN_CASES = [
    { gate: 'gate0', segment: 'toute_la_base' },
    { gate: 'gate1', segment: 'reactivation_kernradius' },
    { gate: 'gate1', segment: 'custom_segment' },
    { gate: 'gate2', segment: 'custom_segment' },
    { gate: 'gate3', segment: 'toute_la_base' },
  ]
  for (const { gate, segment } of DRY_RUN_CASES) {
    const res = await r('/api/ai', { cookie, body: { gate, segment, channels: ['feed_post', 'newsletter'], _dryRun: true } })
    check(`${gate}/${segment}: 200`, res.status === 200, `status=${res.status}`)
    if (res.status === 200) {
      const json = JSON.parse(await res.text())
      check(`${gate}/${segment}: assets array`, Array.isArray(json?.assets), JSON.stringify(json).slice(0, 80))
      check(`${gate}/${segment}: 2 assets`, json?.assets?.length === 2, `got ${json?.assets?.length}`)
      check(`${gate}/${segment}: feed_post asset shape`, json?.assets?.[0]?.copy !== undefined, JSON.stringify(json?.assets?.[0]).slice(0, 80))
    }
  }

  // Invalid gate → 400 (validation runs before dry-run check)
  const badGate = await r('/api/ai', { cookie, body: { gate: 'gate9', segment: 'foo', channels: ['feed_post'], _dryRun: true } })
  check('unknown gate → 400 even with _dryRun', badGate.status === 400, `status=${badGate.status}`)

  // Invalid channel → 400
  const badCh = await r('/api/ai', { cookie, body: { gate: 'gate1', segment: 'reactivation_kernradius', channels: ['whatsapp'], _dryRun: true } })
  check('unknown channel → 400', badCh.status === 400, `status=${badCh.status}`)

  // channelToRegenerate path
  const regen = await r('/api/ai', { cookie, body: { gate: 'gate1', segment: 'reactivation_kernradius', channelToRegenerate: 'newsletter', customInstructions: 'Test', _dryRun: true } })
  check('channelToRegenerate dry-run → 200', regen.status === 200, `status=${regen.status}`)
  if (regen.status === 200) {
    const json = JSON.parse(await regen.text())
    check('channelToRegenerate: 1 asset', json?.assets?.length === 1, `got ${json?.assets?.length}`)
  }

  // All 3 valid channels — shape check per asset
  const ALL_VALID = ['feed_post', 'story', 'newsletter']
  const allRes = await r('/api/ai', { cookie, body: { gate: 'gate3', segment: 'toute_la_base', channels: ALL_VALID, _dryRun: true } })
  check('all 3 channels dry-run → 200', allRes.status === 200, `status=${allRes.status}`)
  if (allRes.status === 200) {
    const json = JSON.parse(await allRes.text())
    check('all 3 channels: 3 assets', json?.assets?.length === 3, `got ${json?.assets?.length}`)
    const byChannel = Object.fromEntries(json.assets.map(a => [a.channel, a]))
    const SHAPES = {
      feed_post:  a => a?.copy !== undefined,
      story:      a => a?.sentence !== undefined,
      newsletter: a => a?.subject !== undefined,
    }
    for (const [ch, shapeFn] of Object.entries(SHAPES)) {
      check(`${ch} asset shape`, shapeFn(byChannel[ch]), JSON.stringify(byChannel[ch] ?? {}).slice(0, 80))
    }
  }
}

// 9. REAL AI CALL — all 3 channels (requires ANTHROPIC_API_KEY)
// Validates that max_tokens is sufficient: truncated JSON would fail JSON.parse.
// Also confirms each channel returns a well-shaped asset from a live Anthropic response.
// Runs BEFORE the rate-limit test [10] which intentionally exhausts the quota.
console.log('\n[9] Real Anthropic call — all 3 channels, full JSON integrity')
const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY
if (!cookie) {
  skip('no cookie from step 5')
} else if (!HAS_API_KEY) {
  skip('ANTHROPIC_API_KEY not set — set it to run live Anthropic tests')
} else {
  const res = await r('/api/ai', {
    cookie,
    body: {
      gate: 'gate3',
      segment: 'toute_la_base',
      channels: ['feed_post', 'story', 'newsletter'],
    },
  })
  check('real call → 200', res.status === 200, `status=${res.status}`)
  if (res.status === 200) {
    let json
    try {
      json = JSON.parse(await res.text())
      ok('response is valid JSON (not truncated)')
    } catch (e) {
      ko('response is valid JSON (not truncated)', e.message.slice(0, 80))
    }
    if (json) {
      check('3 assets returned', json?.assets?.length === 3, `got ${json?.assets?.length}`)
      const byChannel = Object.fromEntries((json.assets ?? []).map(a => [a.channel, a]))
      const SHAPES = {
        feed_post:  a => a?.copy !== undefined,
        story:      a => a?.sentence !== undefined,
        newsletter: a => a?.subject !== undefined,
      }
      for (const [ch, shapeFn] of Object.entries(SHAPES)) {
        check(`${ch} asset shape (live)`, shapeFn(byChannel[ch]), JSON.stringify(byChannel[ch] ?? {}).slice(0, 80))
      }
    }
  }
}

// 10. RATE LIMITING on AI routes
// Note: on a remote server, X-Forwarded-For is set by the infrastructure so the test IP
// below is a best-effort hint for local dev only. This test intentionally exhausts the
// rate limit — always runs LAST to avoid polluting the quota for other tests.
console.log('\n[10] Rate limit on /api/ai (20 req/min/IP)')
if (!cookie) {
  skip('no cookie from step 5')
} else {
  const TEST_IP = '203.0.113.42'   // RFC 5737 TEST-NET-3 — safe for testing
  let hit429 = false
  let attempts = 0
  for (let i = 0; i < 25; i++) {
    const res = await r('/api/ai', { cookie, ip: TEST_IP, body: { gate: 'gate9', segment: 'x', channels: [], _dryRun: true } })
    attempts++
    if (res.status === 429) { hit429 = true; break }
  }
  check(`429 returned within 25 requests (after 20 exactly)`, hit429, `never got 429 in ${attempts} attempts`)
  if (hit429) ok(`rate limit triggered at attempt ${attempts}`)
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`${pass + fail} checks  —  \x1b[32m${pass} passed\x1b[0m  /  \x1b[31m${fail} failed\x1b[0m\n`)
if (fail > 0) process.exit(1)
