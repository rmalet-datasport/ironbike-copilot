import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPTS, buildUserPrompt, buildRegeneratePrompt } from '@/lib/ai/prompts';
import { isRateLimited } from '@/lib/rate-limit';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_CHANNELS = new Set(['feed_post', 'story', 'newsletter'])

const ASSET_SCHEMA = {
  type: 'object' as const,
  properties: {
    assets: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          channel: { type: 'string' as const, enum: ['feed_post', 'story', 'newsletter'] },
          copy: { type: 'string' as const, description: 'feed_post — Post-Text auf Deutsch (Schweizer Hochdeutsch).' },
          cta: { type: 'string' as const, description: "feed_post — Kurzer Call-to-Action, z.B. 'Jetzt anmelden'." },
          visualDirection: { type: 'string' as const, enum: ['typo', 'foto', 'ki_illustration'], description: 'feed_post' },
          editionNumber: { type: 'string' as const, description: "story — z.B. 'Countdown Tag 12', weglassen wenn nicht passend." },
          dataPoint: { type: 'string' as const, description: 'story — Eine konkrete Zahl oder Fakt, kurz.' },
          sentence: { type: 'string' as const, description: 'story — Ein bis zwei kurze Sätze, Story-Format.' },
          stickerLink: { type: 'string' as const, description: 'story — optionaler Link-Sticker-Text, weglassen bei den letzten Countdown-Items.' },
          subject: { type: 'string' as const, description: 'newsletter — Betreffzeile.' },
          preheader: { type: 'string' as const, description: 'newsletter — Vorschautext, max. 100 Zeichen.' },
          body: { type: 'string' as const, description: 'newsletter — Newsletter-Text auf Deutsch.' },
          personalizationFields: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: "newsletter — nur angeben, wenn eine echte Personalisierung (z.B. Vorname) im Text verwendet wird.",
          },
          meta: { type: 'string' as const, description: 'Ein Satz, der die Absicht des Assets beschreibt.' },
        },
        required: ['channel', 'meta'],
      },
    },
  },
  required: ['assets'],
}

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
      tools: [{
        name: 'generate_campaign_assets',
        description: 'Liefert die generierten Marketing-Assets als strukturierte Daten.',
        input_schema: ASSET_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'generate_campaign_assets' },
    });

    const toolUse = message.content.find(block => block.type === 'tool_use');
    if (!toolUse) {
      return new Response(JSON.stringify({ error: 'No structured output from model' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(toolUse.input), {
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
