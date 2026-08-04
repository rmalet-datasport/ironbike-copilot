import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPTS, buildUserPrompt, buildRegeneratePrompt } from '@/lib/ai/prompts';
import { isRateLimited } from '@/lib/rate-limit';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_CHANNELS = new Set(['feed_post', 'story', 'newsletter'])

function buildDryRunAsset(channel: string) {
  switch (channel) {
    case 'feed_post':  return { channel, copy: '[DRY RUN] Test copy', cta: '[DRY RUN] Jetzt anmelden', visualDirection: 'typo', meta: 'dry-run fixture' }
    case 'story':      return { channel, editionNumber: '[DRY RUN] Tag 1', dataPoint: '[DRY RUN] 30 Jahre', sentence: '[DRY RUN] Test sentence', meta: 'dry-run fixture' }
    case 'newsletter': return { channel, subject: '[DRY RUN] Test subject', preheader: '[DRY RUN] Test preheader', body: '[DRY RUN] Test body', meta: 'dry-run fixture' }
    default:           return { channel, meta: 'dry-run fixture' }
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (isRateLimited(ip, 20, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const body = await req.json();
    const {
      gate, segment, channels, customInstructions, channelToRegenerate, segmentDescription,
      segmentSize, historicalExamples, selectedCategories, selectedSiblingEvents, _dryRun,
    } = body;

    const systemPrompt = SYSTEM_PROMPTS[gate as string]?.[segment as string];

    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `No prompt for ${gate}/${segment}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const channelList: string[] = channelToRegenerate ? [channelToRegenerate] : (channels ?? [])
    const invalidChannels = channelList.filter(c => !VALID_CHANNELS.has(c))
    if (invalidChannels.length > 0) {
      return new Response(JSON.stringify({ error: `Unknown channel(s): ${invalidChannels.join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (_dryRun) {
      const assets = channelList.map(buildDryRunAsset)
      return new Response(JSON.stringify({ assets }), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const userPrompt = channelToRegenerate
      ? buildRegeneratePrompt(channelToRegenerate, customInstructions ?? '', historicalExamples ?? [], selectedCategories ?? [], selectedSiblingEvents ?? [])
      : buildUserPrompt({
          channels: channels ?? [],
          customInstructions,
          segmentDescription,
          segmentSize,
          historicalExamples: historicalExamples ?? [],
          selectedCategories: selectedCategories ?? [],
          selectedSiblingEvents: selectedSiblingEvents ?? [],
        });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const text = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();

    return new Response(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('[AI Route Error]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
