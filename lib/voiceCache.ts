import { create } from 'zustand';
import { useVoiceStore } from './voiceStore';
import { t, LanguageCode, TranslationKey } from './translations';

// ============================================
// Voice Pre-Cache System
// ============================================
// Generates all possible announcement audio clips at match start
// so they play instantly with zero network latency on court.

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Cache: text → base64 audio data URI
const audioCache = new Map<string, string>();

// Concurrency control
const MAX_CONCURRENT = 3;
let abortController: AbortController | null = null;

// ─── Cache status store (for UI progress) ───────────────────
interface CacheStatus {
  isGenerating: boolean;
  total: number;
  completed: number;
  failed: number;
}

export const useCacheStore = create<CacheStatus>(() => ({
  isGenerating: false,
  total: 0,
  completed: 0,
  failed: 0,
}));

// ─── Public API ─────────────────────────────────────────────

/** Look up a cached audio clip by its announcement text */
export function getCachedAudio(text: string): string | null {
  return audioCache.get(text) || null;
}

/** Check if pre-caching is active */
export function isCacheReady(): boolean {
  const { isGenerating, total, completed } = useCacheStore.getState();
  return !isGenerating && total > 0 && completed > 0;
}

/** Get cache stats */
export function getCacheStats(): { cached: number; total: number } {
  const { total, completed } = useCacheStore.getState();
  return { cached: completed, total };
}

/** Clear all cached audio */
export function clearCache() {
  audioCache.clear();
  useCacheStore.setState({ isGenerating: false, total: 0, completed: 0, failed: 0 });
  console.log('🗑️ Voice cache cleared');
}

/** Cancel any in-progress cache generation */
export function cancelCacheGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  useCacheStore.setState({ isGenerating: false });
  console.log('⏹️ Cache generation cancelled');
}

/** Generate all announcement audio clips for a match */
export async function generateCache(playerA: string, playerB: string): Promise<void> {
  const { precacheEnabled, voiceEngine } = useVoiceStore.getState();
  
  if (!precacheEnabled) {
    console.log('💤 Pre-cache disabled');
    return;
  }
  
  if (voiceEngine === 'native') {
    console.log('💤 Pre-cache skipped (native TTS is instant)');
    return;
  }

  // Cancel any previous generation
  cancelCacheGeneration();
  clearCache();

  const lang = useVoiceStore.getState().language as LanguageCode;
  
  // Build list of all texts to cache with their announcement styles
  const entries = buildCacheEntries(playerA, playerB, lang);
  
  console.log(`🔥 Pre-caching ${entries.length} announcements (${voiceEngine}, ${lang})...`);
  
  abortController = new AbortController();
  const signal = abortController.signal;
  
  useCacheStore.setState({
    isGenerating: true,
    total: entries.length,
    completed: 0,
    failed: 0,
  });

  // Process in batches with concurrency limit
  let i = 0;
  while (i < entries.length && !signal.aborted) {
    const batch = entries.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(entry => 
      generateSingleClip(entry.text, entry.style, signal)
    );
    await Promise.allSettled(promises);
    i += MAX_CONCURRENT;
  }

  if (!signal.aborted) {
    const { completed, failed } = useCacheStore.getState();
    console.log(`✅ Pre-cache complete: ${completed} cached, ${failed} failed out of ${entries.length}`);
  }
  
  useCacheStore.setState({ isGenerating: false });
  abortController = null;
}

// ─── Internal: Generate a single audio clip ─────────────────

type AnnouncementStyle = 'score' | 'game' | 'set' | 'match' | 'dramatic' | 'calm';

async function generateSingleClip(
  text: string, 
  style: AnnouncementStyle,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) return;
  
  try {
    const { voiceEngine } = useVoiceStore.getState();
    let audioUri: string | null = null;

    if (voiceEngine === 'google') {
      audioUri = await generateGoogleClip(text, style, signal);
    } else if (voiceEngine === 'elevenlabs') {
      audioUri = await generateElevenLabsClip(text, style, signal);
    }

    if (audioUri && !signal.aborted) {
      audioCache.set(text, audioUri);
      useCacheStore.setState(s => ({ completed: s.completed + 1 }));
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.log(`⚠️ Cache miss for "${text}": ${e.message}`);
      useCacheStore.setState(s => ({ failed: s.failed + 1 }));
    }
  }
}

// ─── Google Cloud TTS clip generation ───────────────────────

function wrapInSSML(text: string, style: AnnouncementStyle): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  switch (style) {
    case 'score':
      return `<speak><prosody rate="95%" pitch="-1st">${escaped}</prosody></speak>`;
    case 'game':
      return `<speak><prosody rate="92%" pitch="-1st"><emphasis level="moderate">${escaped.replace('...', '</emphasis><break time="400ms"/><prosody pitch="-2st">')}</prosody></prosody></speak>`;
    case 'set':
      return `<speak><prosody rate="88%" pitch="-2st" volume="+1dB"><emphasis level="strong">${escaped.replace('...', '</emphasis><break time="500ms"/>')}</prosody></speak>`;
    case 'match':
      return `<speak><prosody rate="85%" pitch="-2st" volume="+2dB"><emphasis level="strong">${escaped}</emphasis></prosody></speak>`;
    case 'dramatic':
      return `<speak><break time="200ms"/><prosody rate="90%" pitch="-1st" volume="+1dB"><emphasis level="strong">${escaped}</emphasis></prosody></speak>`;
    case 'calm':
      return `<speak><prosody rate="95%" pitch="0st">${escaped}</prosody></speak>`;
    default:
      return `<speak>${escaped}</speak>`;
  }
}

async function generateGoogleClip(
  text: string, 
  style: AnnouncementStyle,
  signal: AbortSignal
): Promise<string | null> {
  const { googleSettings, googleApiKey } = useVoiceStore.getState();
  if (!googleApiKey) return null;

  const ssml = wrapInSSML(text, style);

  const response = await fetch(`${GOOGLE_TTS_API_URL}?key=${googleApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      input: { ssml },
      voice: {
        languageCode: googleSettings.voiceId.split('-').slice(0, 2).join('-'),
        name: googleSettings.voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: googleSettings.speakingRate || 1.0,
        pitch: googleSettings.pitch || 0,
        effectsProfileId: ['medium-bluetooth-speaker-class-device'],
      },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (!data.audioContent) return null;

  return `data:audio/mp3;base64,${data.audioContent}`;
}

// ─── ElevenLabs clip generation ─────────────────────────────

function prepareTextForElevenLabs(text: string): string {
  let prepared = text.replace(/\.\.\./g, '.');
  prepared = prepared.replace(/\.\s*\./g, '.');
  prepared = prepared.trim();
  if (!/[.!?]$/.test(prepared)) prepared += '.';
  return prepared;
}

const STYLE_OFFSETS: Record<AnnouncementStyle, { stabilityOffset: number; styleOffset: number }> = {
  score:    { stabilityOffset:  0,    styleOffset:  0    },
  game:     { stabilityOffset: -0.05, styleOffset: +0.10 },
  set:      { stabilityOffset: -0.10, styleOffset: +0.20 },
  match:    { stabilityOffset: -0.15, styleOffset: +0.30 },
  dramatic: { stabilityOffset: -0.10, styleOffset: +0.25 },
  calm:     { stabilityOffset: +0.10, styleOffset: -0.10 },
};

function clamp(v: number, min = 0, max = 1) { return Math.min(max, Math.max(min, v)); }

async function generateElevenLabsClip(
  text: string, 
  style: AnnouncementStyle,
  signal: AbortSignal
): Promise<string | null> {
  const { settings, elevenLabsApiKey, language } = useVoiceStore.getState();
  if (!elevenLabsApiKey) return null;

  const lang = language as LanguageCode;
  const modelId = lang === 'en' ? 'eleven_flash_v2_5' : 'eleven_multilingual_v2';
  const offsets = STYLE_OFFSETS[style] || STYLE_OFFSETS.score;
  const preparedText = prepareTextForElevenLabs(text);

  const response = await fetch(`${ELEVENLABS_API_URL}/${settings.voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey,
    },
    signal,
    body: JSON.stringify({
      text: preparedText,
      model_id: modelId,
      voice_settings: {
        stability: clamp(settings.stability + offsets.stabilityOffset),
        similarity_boost: settings.similarityBoost,
        style: clamp(settings.style + offsets.styleOffset),
        use_speaker_boost: settings.useSpeakerBoost,
      },
    }),
  });

  if (!response.ok) return null;

  const arrayBuffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return `data:audio/mpeg;base64,${base64}`;
}

// ─── Build all texts to pre-cache ───────────────────────────

interface CacheEntry {
  text: string;
  style: AnnouncementStyle;
}

function pointToWord(point: number, lang: LanguageCode): string {
  if (point === 0) return t('love', lang);
  if (point === 15) return t('fifteen', lang);
  if (point === 30) return t('thirty', lang);
  if (point === 40) return t('forty', lang);
  return String(point);
}

function gameScoreWord(n: number, lang: LanguageCode): string {
  if (n === 0) return t('love', lang);
  return String(n);
}

function buildCacheEntries(playerA: string, playerB: string, lang: LanguageCode): CacheEntry[] {
  const entries: CacheEntry[] = [];
  const seen = new Set<string>();
  
  function add(text: string, style: AnnouncementStyle) {
    if (!seen.has(text)) {
      seen.add(text);
      entries.push({ text, style });
    }
  }

  // ═══════════════════════════════════════════════════════
  // PRIORITY ORDER — what's needed soonest comes first
  // so the cache is useful even while still generating.
  // ═══════════════════════════════════════════════════════

  // ─── P1: FIRST POINT SCORES (needed within seconds) ───
  // The very first point of the match produces one of these:
  const earlyPointPairs = [
    [15, 0], [0, 15], // after 1st point
    [30, 0], [0, 30], [15, 15], // after 2nd point
    [40, 0], [0, 40], [30, 15], [15, 30], // after 3rd point
    [40, 15], [15, 40], [30, 30], // after 4th point
    [40, 30], [30, 40], // after 5th point
  ];
  for (const [s, r] of earlyPointPairs) {
    const sw = pointToWord(s, lang);
    const rw = pointToWord(r, lang);
    if (s === r) {
      add(`${sw}-${t('all', lang)}`, 'score');
    } else {
      add(`${sw}-${rw}`, 'score');
    }
  }

  // Deuce & advantage — can happen from 5th point onward
  add(t('deuce', lang), 'score');
  add(`${t('advantage', lang)} ${playerA}`, 'score');
  add(`${t('advantage', lang)} ${playerB}`, 'score');

  // ─── P2: FIRST GAME WON (needed after ~4-8 points) ────
  for (const winner of [playerA, playerB]) {
    const loser = winner === playerA ? playerB : playerA;
    // 1-0 scores (first game of match)
    add(`${t('game', lang)} ${winner}... ${winner} ${t('leads', lang)} ${gameScoreWord(1, lang)} ${t('gamesTo', lang)} ${gameScoreWord(0, lang)}`, 'game');
    add(`${t('game', lang)} ${winner}... ${gameScoreWord(1, lang)} ${gameScoreWord(0, lang)}`, 'game');
  }

  // To serve — needed right after first game
  add(`${playerA} ${t('toServe', lang)}`, 'calm');
  add(`${playerB} ${t('toServe', lang)}`, 'calm');

  // ─── P3: FIRST CHANGEOVER (after game 1 = odd total) ──
  const changeoverPhrases = [
    t('changeover', lang),
    t('playersChangeSides', lang),
    t('changeOfEnds', lang),
  ];
  const durationPhrases = [
    t('ninetySeconds', lang),
    t('ninetySecondBreak', lang),
    t('oneAndAHalfMinutes', lang),
    `90 ${t('seconds', lang)}`,
  ];
  for (const cp of changeoverPhrases) {
    for (const dp of durationPhrases) {
      add(`${cp}... ${dp}`, 'calm');
    }
  }
  // "Time... X to serve" after changeover timer
  add(`${t('time', lang)}... ${playerA} ${t('toServe', lang)}`, 'calm');
  add(`${t('time', lang)}... ${playerB} ${t('toServe', lang)}`, 'calm');

  // ─── P4: EARLY GAME SCORES (games 1-1 through 3-3) ────
  for (const winner of [playerA, playerB]) {
    const loser = winner === playerA ? playerB : playerA;
    for (let w = 1; w <= 3; w++) {
      for (let l = 0; l <= 3; l++) {
        if (w === 0 && l === 0) continue;
        if (w === 1 && l === 0) continue; // already added in P2
        if (w === l) {
          add(`${t('game', lang)} ${winner}... ${w} ${t('gamesAll', lang)}`, 'game');
        } else {
          const leader = w > l ? winner : loser;
          add(`${t('game', lang)} ${winner}... ${leader} ${t('leads', lang)} ${gameScoreWord(Math.max(w, l), lang)} ${t('gamesTo', lang)} ${gameScoreWord(Math.min(w, l), lang)}`, 'game');
          add(`${t('game', lang)} ${winner}... ${gameScoreWord(w, lang)} ${gameScoreWord(l, lang)}`, 'game');
        }
      }
    }
  }

  // ─── P5: REMAINING POINT SCORES (any stragglers) ──────
  const pointValues = [0, 15, 30, 40];
  for (const s of pointValues) {
    for (const r of pointValues) {
      if (s === 40 && r === 40) continue;
      if (s === 0 && r === 0) continue;
      const sw = pointToWord(s, lang);
      const rw = pointToWord(r, lang);
      if (s === r) {
        add(`${sw}-${t('all', lang)}`, 'score');
      } else {
        add(`${sw}-${rw}`, 'score');
      }
    }
  }

  // ─── P6: MID-MATCH GAME SCORES (4-0 through 6-6) ─────
  for (const winner of [playerA, playerB]) {
    const loser = winner === playerA ? playerB : playerA;
    for (let w = 1; w <= 6; w++) {
      for (let l = 0; l <= 6; l++) {
        if (w <= 3 && l <= 3) continue; // already added in P4
        if (w === l) {
          add(`${t('game', lang)} ${winner}... ${w} ${t('gamesAll', lang)}`, 'game');
        } else {
          const leader = w > l ? winner : loser;
          add(`${t('game', lang)} ${winner}... ${leader} ${t('leads', lang)} ${gameScoreWord(Math.max(w, l), lang)} ${t('gamesTo', lang)} ${gameScoreWord(Math.min(w, l), lang)}`, 'game');
          add(`${t('game', lang)} ${winner}... ${gameScoreWord(w, lang)} ${gameScoreWord(l, lang)}`, 'game');
        }
      }
    }
  }

  // ─── P7: SET POINT & SET WON (mid-to-late set) ────────
  add(`${t('setPoint', lang)}, ${playerA}`, 'dramatic');
  add(`${t('setPoint', lang)}, ${playerB}`, 'dramatic');

  for (const winner of [playerA, playerB]) {
    for (let w = 6; w <= 7; w++) {
      for (let l = 0; l <= 6; l++) {
        if (w <= l) continue;
        add(`${t('gameAndSet', lang)}, ${winner}... ${gameScoreWord(w, lang)} ${gameScoreWord(l, lang)}`, 'set');
        add(`${t('set', lang)} ${winner}... ${gameScoreWord(w, lang)} ${t('gamesTo', lang)} ${gameScoreWord(l, lang)}`, 'set');
      }
    }
  }

  // Set break phrases
  const setBreakAnnouncements = [
    `${t('setBreak', lang)}... ${t('twoMinuteBreak', lang)}`,
    `${t('setBreak', lang)}... 120 ${t('seconds', lang)}`,
    t('twoMinuteBreak', lang),
  ];
  for (const sba of setBreakAnnouncements) {
    add(sba, 'calm');
  }

  // ─── P8: TIEBREAK (only if set reaches 6-6) ──────────
  add(t('tiebreak', lang), 'dramatic');
  add(t('superTiebreak', lang), 'dramatic');

  for (let a = 0; a <= 7; a++) {
    for (let b = 0; b <= 7; b++) {
      if (a === 0 && b === 0) continue;
      if (a === b) {
        add(`${a}-${t('all', lang)}`, 'score');
      } else if (a > b) {
        add(`${a}-${b}`, 'score');
      } else {
        add(`${b}-${a}`, 'score');
      }
    }
  }

  // ─── P9: MATCH POINT & MATCH WON (end of match) ──────
  add(`${t('matchPoint', lang)}, ${playerA}`, 'match');
  add(`${t('matchPoint', lang)}, ${playerB}`, 'match');
  add(`${t('gameSetMatch', lang)}... ${playerA} ${t('wins', lang)}`, 'match');
  add(`${t('gameSetMatch', lang)}... ${playerB} ${t('wins', lang)}`, 'match');

  console.log(`📋 Built ${entries.length} cache entries for "${playerA}" vs "${playerB}" (${lang})`);
  return entries;
}
