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
  queuedTexts.clear();
  cachedPlayerA = '';
  cachedPlayerB = '';
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

// Track what's been queued to avoid re-generating
const queuedTexts = new Set<string>();
let cachedPlayerA = '';
let cachedPlayerB = '';

/** Initial cache at match start — only point scores + first game */
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
  queuedTexts.clear();
  cachedPlayerA = playerA;
  cachedPlayerB = playerB;

  const lang = useVoiceStore.getState().language as LanguageCode;
  
  // Only cache what's needed for the very start of the match
  const entries = buildInitialEntries(playerA, playerB, lang);
  
  await processEntries(entries);
}

/** Progressive cache — call after each game to cache ahead */
export async function progressCache(
  gamesA: number, 
  gamesB: number, 
  setsPlayed: number,
  tiebreak: boolean
): Promise<void> {
  const { precacheEnabled, voiceEngine } = useVoiceStore.getState();
  if (!precacheEnabled || voiceEngine === 'native') return;
  if (!cachedPlayerA || !cachedPlayerB) return;

  const lang = useVoiceStore.getState().language as LanguageCode;
  const entries = buildProgressiveEntries(
    cachedPlayerA, cachedPlayerB, lang,
    gamesA, gamesB, setsPlayed, tiebreak
  );

  if (entries.length > 0) {
    await processEntries(entries);
  }
}

/** Process a batch of cache entries */
async function processEntries(entries: CacheEntry[]): Promise<void> {
  // Filter out already queued
  const newEntries = entries.filter(e => !queuedTexts.has(e.text));
  if (newEntries.length === 0) return;

  for (const e of newEntries) queuedTexts.add(e.text);

  const { voiceEngine } = useVoiceStore.getState();
  console.log(`🔥 Pre-caching ${newEntries.length} announcements (${voiceEngine})...`);
  
  abortController = new AbortController();
  const signal = abortController.signal;
  
  useCacheStore.setState(s => ({
    isGenerating: true,
    total: s.total + newEntries.length,
  }));

  let i = 0;
  while (i < newEntries.length && !signal.aborted) {
    const batch = newEntries.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(entry => 
      generateSingleClip(entry.text, entry.style, signal)
    );
    await Promise.allSettled(promises);
    i += MAX_CONCURRENT;
  }

  if (!signal.aborted) {
    const { completed, failed, total } = useCacheStore.getState();
    console.log(`✅ Pre-cache batch done: ${completed}/${total} cached, ${failed} failed`);
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

// ─── Entry builders ─────────────────────────────────────────

function createAdder(entries: CacheEntry[], seen: Set<string>) {
  return function add(text: string, style: AnnouncementStyle) {
    if (!seen.has(text)) {
      seen.add(text);
      entries.push({ text, style });
    }
  };
}

/** Add all game-won announcement variants for a specific score */
function addGameWonEntries(
  add: (text: string, style: AnnouncementStyle) => void,
  playerA: string, playerB: string, lang: LanguageCode,
  w: number, l: number, winner: string
) {
  const loser = winner === playerA ? playerB : playerA;
  if (w === l) {
    add(`${t('game', lang)} ${winner}... ${w} ${t('gamesAll', lang)}`, 'game');
  } else {
    const leader = w > l ? winner : loser;
    add(`${t('game', lang)} ${winner}... ${leader} ${t('leads', lang)} ${gameScoreWord(Math.max(w, l), lang)} ${t('gamesTo', lang)} ${gameScoreWord(Math.min(w, l), lang)}`, 'game');
    add(`${t('game', lang)} ${winner}... ${gameScoreWord(w, lang)} ${gameScoreWord(l, lang)}`, 'game');
  }
}

/** Match start — only point scores + first game announcements */
function buildInitialEntries(playerA: string, playerB: string, lang: LanguageCode): CacheEntry[] {
  const entries: CacheEntry[] = [];
  const seen = new Set<string>();
  const add = createAdder(entries, seen);

  // All point scores (reused every game, small fixed set)
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
  add(t('deuce', lang), 'score');
  add(`${t('advantage', lang)} ${playerA}`, 'score');
  add(`${t('advantage', lang)} ${playerB}`, 'score');

  // First game won (1-0)
  for (const winner of [playerA, playerB]) {
    addGameWonEntries(add, playerA, playerB, lang, 1, 0, winner);
  }

  // To serve
  add(`${playerA} ${t('toServe', lang)}`, 'calm');
  add(`${playerB} ${t('toServe', lang)}`, 'calm');

  // First changeover (happens after game 1)
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
  add(`${t('time', lang)}... ${playerA} ${t('toServe', lang)}`, 'calm');
  add(`${t('time', lang)}... ${playerB} ${t('toServe', lang)}`, 'calm');

  console.log(`📋 Initial cache: ${entries.length} entries for "${playerA}" vs "${playerB}" (${lang})`);
  return entries;
}

/** Progressive cache — look ahead 2 games from current state */
function buildProgressiveEntries(
  playerA: string, playerB: string, lang: LanguageCode,
  gamesA: number, gamesB: number, setsPlayed: number, tiebreak: boolean
): CacheEntry[] {
  const entries: CacheEntry[] = [];
  const seen = new Set<string>();
  const add = createAdder(entries, seen);

  const maxGame = Math.max(gamesA, gamesB);
  const totalGames = gamesA + gamesB;

  // Cache game-won announcements for next 2 possible games ahead
  // from current state. E.g. if 2-1, cache all combos up to 4-1, 3-3, etc.
  const lookAhead = 2;
  const maxW = Math.min(gamesA + lookAhead, 7);
  const maxL = Math.min(gamesB + lookAhead, 7);
  
  for (const winner of [playerA, playerB]) {
    for (let w = 0; w <= maxW; w++) {
      for (let l = 0; l <= maxL; l++) {
        if (w === 0 && l === 0) continue;
        // Only cache scores reachable from current state
        if (w < gamesA || l < gamesB) continue;
        if (w === gamesA && l === gamesB) continue; // current score, already played
        addGameWonEntries(add, playerA, playerB, lang, w, l, winner);
      }
    }
  }

  // When either player reaches 4+ games, start caching set point
  if (maxGame >= 4) {
    add(`${t('setPoint', lang)}, ${playerA}`, 'dramatic');
    add(`${t('setPoint', lang)}, ${playerB}`, 'dramatic');
  }

  // When either player reaches 5+ games, cache set won announcements
  if (maxGame >= 5) {
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
    add(`${t('setBreak', lang)}... ${t('twoMinuteBreak', lang)}`, 'calm');
    add(`${t('setBreak', lang)}... 120 ${t('seconds', lang)}`, 'calm');
    add(t('twoMinuteBreak', lang), 'calm');
  }

  // When both players reach 5+ games, cache tiebreak
  if (gamesA >= 5 && gamesB >= 5) {
    add(t('tiebreak', lang), 'dramatic');
    add(t('superTiebreak', lang), 'dramatic');
    // Tiebreak point scores
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
  }

  // In 2nd+ set, cache match point & match won
  if (setsPlayed >= 1) {
    add(`${t('matchPoint', lang)}, ${playerA}`, 'match');
    add(`${t('matchPoint', lang)}, ${playerB}`, 'match');
    add(`${t('gameSetMatch', lang)}... ${playerA} ${t('wins', lang)}`, 'match');
    add(`${t('gameSetMatch', lang)}... ${playerB} ${t('wins', lang)}`, 'match');
  }

  if (entries.length > 0) {
    console.log(`📋 Progressive cache: +${entries.length} entries (games ${gamesA}-${gamesB}, set ${setsPlayed + 1})`);
  }
  return entries;
}
