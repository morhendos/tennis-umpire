import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import { MatchState, getMatchStatus, MatchStatus } from './scoring';
import { useVoiceStore } from './voiceStore';
import { t, LanguageCode, TranslationKey } from './translations';

// API URLs
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Currently playing sound
let currentSound: Audio.Sound | null = null;

// Timer for delayed announcements
let serveTimer: NodeJS.Timeout | null = null;

// Timer for releasing audio focus after announcement
let releaseAudioTimer: NodeJS.Timeout | null = null;

// Whether we're currently in a break (changeover/set break)
let inBreakMode = false;

// Debounce timer for rapid scoring
let speakDebounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 300; // Wait 300ms before speaking

// Generation counter to prevent stale API responses from playing
let speakGeneration = 0;

// Delay before releasing audio focus after announcement finishes
const RELEASE_FOCUS_DELAY_MS = 2000;

// Cache for available voices
let cachedVoices: Speech.Voice[] | null = null;

// ============================================
// SSML Templates for professional umpire style
// ============================================

type AnnouncementStyle = 'score' | 'game' | 'set' | 'match' | 'dramatic' | 'calm';

// Wrap text in SSML with appropriate styling
function wrapInSSML(text: string, style: AnnouncementStyle = 'score'): string {
  // Escape special XML characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  switch (style) {
    case 'score':
      // Regular point scores - clear and measured
      return `<speak><prosody rate="95%" pitch="-1st">${escaped}</prosody></speak>`;
    
    case 'game':
      // Game won - slight emphasis, pause after "Game"
      return `<speak><prosody rate="92%" pitch="-1st"><emphasis level="moderate">${escaped.replace('...', '</emphasis><break time="400ms"/><prosody pitch="-2st">')}</prosody></prosody></speak>`;
    
    case 'set':
      // Set won - more dramatic, slower
      return `<speak><prosody rate="88%" pitch="-2st" volume="+1dB"><emphasis level="strong">${escaped.replace('...', '</emphasis><break time="500ms"/>')}</prosody></speak>`;
    
    case 'match':
      // Match point / Match won - maximum drama
      return `<speak><prosody rate="85%" pitch="-2st" volume="+2dB"><emphasis level="strong">${escaped}</emphasis></prosody></speak>`;
    
    case 'dramatic':
      // Set/Match point announcements
      return `<speak><break time="200ms"/><prosody rate="90%" pitch="-1st" volume="+1dB"><emphasis level="strong">${escaped}</emphasis></prosody></speak>`;
    
    case 'calm':
      // Changeover, time announcements
      return `<speak><prosody rate="95%" pitch="0st">${escaped}</prosody></speak>`;
    
    default:
      return `<speak>${escaped}</speak>`;
  }
}

// Simple SSML for basic announcements (non-Google fallback just uses text)
function createSSML(parts: Array<{ text: string; emphasis?: boolean; pause?: number; pitch?: string; rate?: string }>): string {
  let ssml = '<speak>';
  
  for (const part of parts) {
    if (part.pause) {
      ssml += `<break time="${part.pause}ms"/>`;
    }
    
    let content = part.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const hasModifiers = part.emphasis || part.pitch || part.rate;
    
    if (hasModifiers) {
      const attrs: string[] = [];
      if (part.rate) attrs.push(`rate="${part.rate}"`);
      if (part.pitch) attrs.push(`pitch="${part.pitch}"`);
      
      if (part.emphasis) {
        content = `<emphasis level="moderate">${content}</emphasis>`;
      }
      
      if (attrs.length > 0) {
        content = `<prosody ${attrs.join(' ')}>${content}</prosody>`;
      }
    }
    
    ssml += content;
  }
  
  ssml += '</speak>';
  return ssml;
}

// Initialize audio and load voices
async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    console.log('✅ Audio initialized');
    
    cachedVoices = await Speech.getAvailableVoicesAsync();
    console.log(`📢 Found ${cachedVoices.length} total voices`);
  } catch (e) {
    console.error('❌ Audio init failed:', e);
  }
}
initAudio();

// ============================================
// Audio Focus Management
// ============================================
// Release audio focus so background music (Spotify etc.) resumes at full volume.
// Called after changeover/set break announcements finish.
async function releaseAudioFocus() {
  try {
    console.log('🎵 Releasing audio focus — background music can resume');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false, // Deactivates iOS audio session
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });
  } catch (e) {
    console.error('⚠️ Failed to release audio focus:', e);
  }
}

// Reclaim audio focus before playing announcements.
// Background music will duck (lower volume) while we speak.
async function claimAudioFocus() {
  try {
    if (releaseAudioTimer) {
      clearTimeout(releaseAudioTimer);
      releaseAudioTimer = null;
    }
    console.log('🎤 Claiming audio focus — background music will duck');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  } catch (e) {
    console.error('⚠️ Failed to claim audio focus:', e);
  }
}

// Schedule releasing audio focus after a short delay
// (gives the announcement time to fully finish before handing back to Spotify)
function scheduleAudioFocusRelease() {
  if (releaseAudioTimer) {
    clearTimeout(releaseAudioTimer);
  }
  releaseAudioTimer = setTimeout(() => {
    releaseAudioTimer = null;
    if (inBreakMode) {
      releaseAudioFocus();
    }
  }, RELEASE_FOCUS_DELAY_MS);
}

// Helper to pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get current language
function getLang(): LanguageCode {
  return useVoiceStore.getState().language as LanguageCode;
}

// Cancel any pending serve announcement and exit break mode
export function cancelServeTimer() {
  if (serveTimer) {
    clearTimeout(serveTimer);
    serveTimer = null;
  }
  if (releaseAudioTimer) {
    clearTimeout(releaseAudioTimer);
    releaseAudioTimer = null;
  }
  if (inBreakMode) {
    inBreakMode = false;
    claimAudioFocus();
  }
}

// Enter break mode — after the current announcement finishes playing,
// release audio focus so background music resumes at full volume.
function enterBreakMode() {
  inBreakMode = true;
  onPlaybackFinished = () => {
    if (inBreakMode) {
      console.log('🎵 Break mode: announcement finished, releasing audio focus in 1s...');
      scheduleAudioFocusRelease();
    }
  };
}

// Find best native voice for a language
async function findNativeVoice(langCode: string): Promise<{ id: string; lang: string } | null> {
  if (!cachedVoices) {
    cachedVoices = await Speech.getAvailableVoicesAsync();
  }
  
  const preferredLocales: Record<string, string[]> = {
    en: ['en-GB', 'en-AU', 'en-US'],
    es: ['es-ES', 'es-MX'],
    fr: ['fr-FR', 'fr-CA'],
    it: ['it-IT'],
  };
  
  const locales = preferredLocales[langCode] || [];
  
  for (const locale of locales) {
    const voice = cachedVoices.find(v => 
      v.language.toLowerCase() === locale.toLowerCase()
    );
    if (voice) {
      return { id: voice.identifier, lang: voice.language };
    }
  }
  
  const fallbackVoice = cachedVoices.find(v => 
    v.language.toLowerCase().startsWith(langCode.toLowerCase())
  );
  
  if (fallbackVoice) {
    return { id: fallbackVoice.identifier, lang: fallbackVoice.language };
  }
  
  return null;
}

// Secondary sound for stadium echo effect
let echoSound: Audio.Sound | null = null;

// Trigger stadium echo if enabled, using delay + volume from settings
function triggerEchoIfEnabled(uri: string) {
  const { stadiumEcho, echoDelay, echoVolume } = useVoiceStore.getState();
  if (!stadiumEcho) return;
  console.log(`🏟️ Echo: delay ${echoDelay}ms, vol ${echoVolume.toFixed(2)}`);
  playEcho(uri, echoDelay, echoVolume);
}

// Play a delayed, quieter copy of the audio for stadium echo effect
function playEcho(uri: string, delayMs: number = 120, volume: number = 0.3) {
  setTimeout(async () => {
    try {
      // Clean up previous echo if still playing
      if (echoSound) {
        try { await echoSound.stopAsync(); await echoSound.unloadAsync(); } catch (_) {}
        echoSound = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume }
      );
      echoSound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          if (echoSound === sound) echoSound = null;
        }
      });
    } catch (e) {
      console.log('⚠️ Echo playback failed:', e);
    }
  }, delayMs);
}

// Stop any currently playing audio
async function stopCurrentAudio() {
  // Clear playback callback to prevent stale sounds from triggering it
  onPlaybackFinished = null;
  
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {
      // Ignore errors when stopping
    }
    currentSound = null;
  }
  // Also stop any echo
  if (echoSound) {
    try { await echoSound.stopAsync(); await echoSound.unloadAsync(); } catch (_) {}
    echoSound = null;
  }
}

// Main speak function - with debouncing for rapid scoring
export async function speak(text: string, style: AnnouncementStyle = 'score'): Promise<void> {
  const { audioEnabled } = useVoiceStore.getState();
  
  if (!audioEnabled) {
    console.log('🔇 Audio disabled');
    return;
  }
  
  // Cancel any pending debounced speech
  if (speakDebounceTimer) {
    clearTimeout(speakDebounceTimer);
    speakDebounceTimer = null;
  }
  
  // Always reclaim audio focus before speaking
  // (this ducks Spotify/background music and exits break mode if active)
  if (inBreakMode) {
    console.log('🎵 Exiting break mode — reclaiming audio focus');
    inBreakMode = false;
  }
  await claimAudioFocus();
  
  // Stop current audio immediately
  await stopCurrentAudio();
  Speech.stop();
  
  // Increment generation — any in-flight API calls from previous speak() calls
  // will see a stale generation and skip playback
  const gen = ++speakGeneration;
  
  // For regular point scores, debounce to handle rapid tapping
  // Important announcements (game, set, match) play immediately
  if (style === 'score') {
    console.log(`🎤 Debouncing (${DEBOUNCE_MS}ms): "${text}"`);
    speakDebounceTimer = setTimeout(() => {
      speakDebounceTimer = null;
      speakInternal(text, style, gen);
    }, DEBOUNCE_MS);
  } else {
    // Important announcements - play immediately
    await speakInternal(text, style, gen);
  }
}

// Callback to run after current announcement finishes playing
let onPlaybackFinished: (() => void) | null = null;

// Internal speak function - does the actual TTS work
async function speakInternal(text: string, style: AnnouncementStyle, gen: number): Promise<void> {
  // Check if this request is still current (not superseded by a newer speak() call)
  if (gen !== speakGeneration) {
    console.log(`🚫 Skipping stale speak (gen ${gen}, current ${speakGeneration}): "${text}"`);
    return;
  }
  
  const { 
    settings, 
    googleSettings,
    voiceEngine, 
    elevenLabsApiKey,
    googleApiKey,
  } = useVoiceStore.getState();
  
  console.log(`🎤 Speaking (${voiceEngine}, ${style}, gen ${gen}): "${text}"`);
  
  // Native TTS
  if (voiceEngine === 'native') {
    await speakNative(text);
    return;
  }
  
  // Google Cloud TTS with SSML
  if (voiceEngine === 'google') {
    if (googleApiKey) {
      try {
        const ssml = wrapInSSML(text, style);
        await speakWithGoogle(ssml, googleSettings, googleApiKey, true, gen);
        console.log('✅ Google TTS success');
        return;
      } catch (error) {
        console.log('⚠️ Google TTS failed, using native:', error);
        await speakNative(text);
        return;
      }
    } else {
      console.log('⚠️ No Google API key, using native TTS');
      await speakNative(text);
      return;
    }
  }
  
  // ElevenLabs TTS
  if (voiceEngine === 'elevenlabs') {
    if (elevenLabsApiKey) {
      try {
        await speakWithElevenLabs(text, settings, elevenLabsApiKey, gen, style);
        console.log('✅ ElevenLabs success');
        return;
      } catch (error) {
        console.log('⚠️ ElevenLabs failed, using native:', error);
        await speakNative(text);
        return;
      }
    } else {
      console.log('⚠️ No ElevenLabs API key, using native TTS');
      await speakNative(text);
      return;
    }
  }
  
  // Fallback to native
  await speakNative(text);
}

// Google Cloud TTS - now supports SSML
async function speakWithGoogle(text: string, settings: any, apiKey: string, isSSML: boolean = false, gen?: number): Promise<void> {
  console.log('🔄 Calling Google Cloud TTS...');
  if (isSSML) {
    console.log('📝 Using SSML:', text);
  }
  
  await stopCurrentAudio();

  const input = isSSML ? { ssml: text } : { text };

  const response = await fetch(`${GOOGLE_TTS_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      voice: {
        languageCode: settings.voiceId.split('-').slice(0, 2).join('-'),
        name: settings.voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: settings.speakingRate || 1.0,
        pitch: settings.pitch || 0,
        // Optimize for outdoor speaker
        effectsProfileId: ['medium-bluetooth-speaker-class-device'],
      },
    }),
  });

  console.log(`📡 Google API Response: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `Status: ${response.status}`;
    const errorStatus = errorData?.error?.status || 'UNKNOWN';
    
    console.error('Google TTS error:', JSON.stringify(errorData, null, 2));
    
    let userMessage = errorMessage;
    if (errorStatus === 'PERMISSION_DENIED' || errorMessage.includes('API has not been used')) {
      userMessage = 'Text-to-Speech API not enabled.\n\nGo to Google Cloud Console → APIs → Enable "Cloud Text-to-Speech API"';
    } else if (errorStatus === 'INVALID_ARGUMENT') {
      userMessage = 'Invalid voice or settings. Try a different voice.';
    } else if (response.status === 403) {
      userMessage = 'API key not authorized. Check your Google Cloud Console settings.';
    }
    
    Alert.alert('Google TTS Error', userMessage);
    throw new Error(`Google TTS API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.audioContent) {
    throw new Error('No audio content in response');
  }

  // Check if this request is still current after async API call
  if (gen !== undefined && gen !== speakGeneration) {
    console.log(`🚫 Google TTS response arrived but gen ${gen} is stale (current: ${speakGeneration}), skipping playback`);
    return;
  }

  const uri = `data:audio/mp3;base64,${data.audioContent}`;

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true }
  );
  
  console.log('🔊 Playing Google TTS...');

  currentSound = sound;

  triggerEchoIfEnabled(uri);

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('✅ Playback finished');
      sound.unloadAsync();
      if (currentSound === sound) {
        currentSound = null;
      }
      // Trigger post-playback callback (e.g. release audio focus for break)
      if (onPlaybackFinished) {
        const cb = onPlaybackFinished;
        onPlaybackFinished = null;
        cb();
      }
    }
  });
}

// ============================================
// ElevenLabs style adjustments
// ============================================
// Adjust voice_settings per announcement style for dramatic variation.
// Values are offsets applied to the user's base settings (clamped 0–1).
const ELEVENLABS_STYLE_OFFSETS: Record<AnnouncementStyle, {
  stabilityOffset: number;
  styleOffset: number;
}> = {
  score:    { stabilityOffset:  0,    styleOffset:  0    },  // User defaults — calm, routine
  game:     { stabilityOffset: -0.05, styleOffset: +0.10 },  // Slightly more energy
  set:      { stabilityOffset: -0.10, styleOffset: +0.20 },  // Dramatic
  match:    { stabilityOffset: -0.15, styleOffset: +0.30 },  // Maximum drama
  dramatic: { stabilityOffset: -0.10, styleOffset: +0.25 },  // Set/match point tension
  calm:     { stabilityOffset: +0.10, styleOffset: -0.10 },  // Neutral, measured
};

function clamp(v: number, min = 0, max = 1) { return Math.min(max, Math.max(min, v)); }

// Prepare text for ElevenLabs: convert umpire-style `...` separators into
// proper sentence breaks so the model treats each part as a distinct statement.
function prepareTextForElevenLabs(text: string): string {
  // Replace "..." pause markers with period + space (firm sentence end)
  let prepared = text.replace(/\.\.\./g, '.');
  // Collapse multiple periods from replacements like ". ." 
  prepared = prepared.replace(/\.\s*\./g, '.');
  // Ensure the text ends with punctuation so ElevenLabs closes the statement
  prepared = prepared.trim();
  if (!/[.!?]$/.test(prepared)) {
    prepared += '.';
  }
  return prepared;
}

// ElevenLabs TTS
async function speakWithElevenLabs(text: string, settings: any, apiKey: string, gen?: number, style: AnnouncementStyle = 'score'): Promise<void> {
  console.log('🔄 Calling ElevenLabs API...');
  
  await stopCurrentAudio();

  const lang = getLang();
  const modelId = lang === 'en' ? 'eleven_flash_v2_5' : 'eleven_multilingual_v2';
  
  // Apply per-style adjustments to user's base settings
  const offsets = ELEVENLABS_STYLE_OFFSETS[style] || ELEVENLABS_STYLE_OFFSETS.score;
  const adjustedStability = clamp(settings.stability + offsets.stabilityOffset);
  const adjustedStyle = clamp(settings.style + offsets.styleOffset);
  
  // Prepare text for ElevenLabs (proper sentence breaks)
  const preparedText = prepareTextForElevenLabs(text);
  
  console.log(`🌍 Using model: ${modelId} for language: ${lang}`);
  console.log(`🎭 Style: ${style} → stability: ${adjustedStability.toFixed(2)}, excitement: ${adjustedStyle.toFixed(2)}`);

  const response = await fetch(`${ELEVENLABS_API_URL}/${settings.voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: preparedText,
      model_id: modelId,
      voice_settings: {
        stability: adjustedStability,
        similarity_boost: settings.similarityBoost,
        style: adjustedStyle,
        use_speaker_boost: settings.useSpeakerBoost,
      },
    }),
  });

  console.log(`📡 API Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`📦 Received ${arrayBuffer.byteLength} bytes`);
  
  // Check if this request is still current after async API call
  if (gen !== undefined && gen !== speakGeneration) {
    console.log(`🚫 ElevenLabs response arrived but gen ${gen} is stale (current: ${speakGeneration}), skipping playback`);
    return;
  }
  
  const base64 = arrayBufferToBase64(arrayBuffer);
  const uri = `data:audio/mpeg;base64,${base64}`;

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true }
  );
  
  console.log('🔊 Playing sound...');

  currentSound = sound;

  triggerEchoIfEnabled(uri);

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('✅ Playback finished');
      sound.unloadAsync();
      if (currentSound === sound) {
        currentSound = null;
      }
      // Trigger post-playback callback (e.g. release audio focus for break)
      if (onPlaybackFinished) {
        const cb = onPlaybackFinished;
        onPlaybackFinished = null;
        cb();
      }
    }
  });
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Native TTS with proper voice selection
async function speakNative(text: string): Promise<void> {
  const lang = getLang();
  const voiceInfo = await findNativeVoice(lang);
  
  Speech.stop();
  
  const options: Speech.SpeechOptions = {
    rate: 0.9,
    pitch: 1.0,
  };
  
  if (voiceInfo) {
    options.voice = voiceInfo.id;
    options.language = voiceInfo.lang;
    console.log(`🗣️ Speaking with voice: ${voiceInfo.id}, lang: ${voiceInfo.lang}`);
  } else {
    const langMap: Record<string, string> = {
      en: 'en-GB',
      es: 'es-ES',
      fr: 'fr-FR',
      it: 'it-IT',
    };
    options.language = langMap[lang] || 'en-GB';
    console.log(`🗣️ Speaking with language fallback: ${options.language}`);
  }
  
  Speech.speak(text, {
    ...options,
    onDone: () => {
      if (onPlaybackFinished) {
        const cb = onPlaybackFinished;
        onPlaybackFinished = null;
        cb();
      }
    },
  });
}

// Stop speech and cancel any pending announcements
export async function stopSpeech(): Promise<void> {
  // Cancel debounced speech
  if (speakDebounceTimer) {
    clearTimeout(speakDebounceTimer);
    speakDebounceTimer = null;
  }
  await stopCurrentAudio();
  Speech.stop();
}

// Export function to get available voices (for debugging in settings)
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  if (!cachedVoices) {
    cachedVoices = await Speech.getAvailableVoicesAsync();
  }
  return cachedVoices;
}

// Format point for speech
function pointToWord(point: number | string): string {
  const lang = getLang();
  if (point === 0) return t('love', lang);
  if (point === 15) return t('fifteen', lang);
  if (point === 30) return t('thirty', lang);
  if (point === 40) return t('forty', lang);
  if (point === 'AD') return t('advantage', lang);
  return String(point);
}

// Schedule "Time. X to serve" announcement after break
function scheduleServeAnnouncement(serverName: string, delaySeconds: number) {
  // Only cancel existing timer, don't exit break mode
  if (serveTimer) {
    clearTimeout(serveTimer);
    serveTimer = null;
  }
  const lang = getLang();
  
  console.log(`⏱️ Scheduling serve announcement in ${delaySeconds} seconds`);
  
  serveTimer = setTimeout(() => {
    serveTimer = null;
    // speak() will automatically reclaim audio focus and exit break mode
    speak(`${t('time', lang)}... ${serverName} ${t('toServe', lang)}`, 'calm');
  }, delaySeconds * 1000);
}

// Announce the current score
export function announceScore(state: MatchState) {
  const lang = getLang();
  const status = getMatchStatus(state);
  const { players, points, tiebreak, tiebreakPoints, server } = state;

  let announcement = '';

  if (status === 'match_complete') {
    announcement = `${t('gameSetMatch', lang)}... ${players[state.winner!].name} ${t('wins', lang)}`;
    speak(announcement, 'match');
    return;
  }

  if (tiebreak) {
    const pA = tiebreakPoints.A;
    const pB = tiebreakPoints.B;

    if (pA === pB) {
      announcement = `${pA}-${t('all', lang)}`;
    } else if (pA > pB) {
      announcement = `${pA}-${pB}`;
    } else {
      announcement = `${pB}-${pA}`;
    }
  } else {
    if (status === 'deuce') {
      announcement = t('deuce', lang);
    } else if (status === 'advantage_A') {
      announcement = `${t('advantage', lang)} ${players.A.name}`;
    } else if (status === 'advantage_B') {
      announcement = `${t('advantage', lang)} ${players.B.name}`;
    } else {
      const serverPoints = points[server];
      const receiverPoints = points[server === 'A' ? 'B' : 'A'];

      const serverWord = pointToWord(serverPoints);
      const receiverWord = pointToWord(receiverPoints);

      if (serverPoints === receiverPoints) {
        announcement = `${serverWord}-${t('all', lang)}`;
      } else {
        announcement = `${serverWord}-${receiverWord}`;
      }
    }
  }

  speak(announcement, 'score');
}

// Announce game won
export function announceGameWon(winner: 'A' | 'B', state: MatchState) {
  const lang = getLang();
  const { players, games, server } = state;
  const winnerName = players[winner].name;
  const loser = winner === 'A' ? 'B' : 'A';
  
  const winnerGames = games[winner];
  const loserGames = games[loser];
  const totalGames = winnerGames + loserGames;
  
  const nextServerName = players[server].name;
  const isChangeover = totalGames % 2 === 1;
  const isFirstChangeover = totalGames === 1;

  let announcement = '';
  const scoreStyle = Math.random();

  if (winnerGames === loserGames) {
    announcement = `${t('game', lang)} ${winnerName}... ${winnerGames} ${t('gamesAll', lang)}`;
  } else if (winnerGames > loserGames) {
    if (scoreStyle < 0.5) {
      announcement = `${t('game', lang)} ${winnerName}... ${winnerName} ${t('leads', lang)} ${winnerGames} ${t('gamesTo', lang)} ${loserGames}`;
    } else {
      announcement = `${t('game', lang)} ${winnerName}... ${winnerGames} ${loserGames}`;
    }
  } else {
    const leaderName = players[loser].name;
    if (scoreStyle < 0.5) {
      announcement = `${t('game', lang)} ${winnerName}... ${leaderName} ${t('leads', lang)} ${loserGames} ${t('gamesTo', lang)} ${winnerGames}`;
    } else {
      announcement = `${t('game', lang)} ${winnerName}... ${winnerGames} ${loserGames}`;
    }
  }

  if (isChangeover) {
    const changeoverPhrases = [
      t('changeover', lang),
      t('playersChangeSides', lang),
      t('changeOfEnds', lang),
    ];
    const changeoverPhrase = randomPick(changeoverPhrases);
    
    if (isFirstChangeover) {
      announcement += `... ${changeoverPhrase}... ${nextServerName} ${t('toServe', lang)}`;
    } else {
      announcement += `... ${changeoverPhrase}, 90 ${t('seconds', lang)}`;
      speak(announcement, 'game');
      enterBreakMode(); // Release audio focus after announcement → Spotify resumes
      scheduleServeAnnouncement(nextServerName, 90);
      return;
    }
  } else {
    announcement += `... ${nextServerName} ${t('toServe', lang)}`;
  }

  speak(announcement, 'game');
}

// Announce set won
export function announceSetWon(
  winner: 'A' | 'B',
  setScore: { A: number; B: number },
  state: MatchState
) {
  const lang = getLang();
  const winnerName = state.players[winner].name;
  const winnerGames = setScore[winner];
  const loserGames = setScore[winner === 'A' ? 'B' : 'A'];
  const nextServerName = state.players[state.server].name;
  
  const style = Math.random();
  
  let announcement = '';
  if (style < 0.5) {
    announcement = `${t('gameAndSet', lang)}, ${winnerName}... ${winnerGames} ${loserGames}`;
  } else {
    announcement = `${t('set', lang)} ${winnerName}... ${winnerGames} ${t('gamesTo', lang)} ${loserGames}`;
  }
  
  const breakPhrases = [
    t('setBreak', lang),
    t('twoMinuteBreak', lang),
    `120 ${t('seconds', lang)}`,
  ];
  const breakPhrase = randomPick(breakPhrases);
  announcement += `... ${breakPhrase}`;
  
  speak(announcement, 'set');
  enterBreakMode(); // Release audio focus after announcement → Spotify resumes
  scheduleServeAnnouncement(nextServerName, 120);
}

// Announce match/set point
export function announceStatus(status: MatchStatus, state: MatchState) {
  const lang = getLang();
  let announcement = '';
  let style: AnnouncementStyle = 'dramatic';

  switch (status) {
    case 'match_point_A':
      announcement = `${t('matchPoint', lang)}, ${state.players.A.name}`;
      style = 'match';
      break;
    case 'match_point_B':
      announcement = `${t('matchPoint', lang)}, ${state.players.B.name}`;
      style = 'match';
      break;
    case 'set_point_A':
      announcement = `${t('setPoint', lang)}, ${state.players.A.name}`;
      break;
    case 'set_point_B':
      announcement = `${t('setPoint', lang)}, ${state.players.B.name}`;
      break;
    default:
      return;
  }

  speak(announcement, style);
}

// Announce tiebreak
export function announceTiebreak() {
  const lang = getLang();
  speak(t('tiebreak', lang), 'dramatic');
}

// Announce super tiebreak (match tiebreak)
export function announceSuperTiebreak() {
  const lang = getLang();
  speak(t('superTiebreak', lang), 'dramatic');
}

// Announce full match score (for hold button / on-demand)
// Gives the complete picture: sets, games, and points
export function announceFullScore(state: MatchState) {
  const lang = getLang();
  const status = getMatchStatus(state);
  const { players, points, games, sets, tiebreak, tiebreakPoints, server } = state;

  // If match complete, just announce the winner
  if (status === 'match_complete') {
    announceScore(state);
    return;
  }

  const setOrdinals: TranslationKey[] = ['firstSet', 'secondSet', 'thirdSet', 'fourthSet', 'fifthSet'];
  let parts: string[] = [];

  // 1. Completed sets (last entry in sets[] is always the current in-progress set)
  const completedSets = sets.slice(0, -1);
  if (completedSets.length > 0) {
    for (let i = 0; i < completedSets.length; i++) {
      const label = t(setOrdinals[i], lang);
      parts.push(`${label} ${completedSets[i].A}-${completedSets[i].B}`);
    }
  }

  // 2. Current set games
  const currentSetNumber = completedSets.length;
  const currentSetLabel = t(setOrdinals[currentSetNumber] || setOrdinals[0], lang);
  const totalGames = games.A + games.B;
  if (totalGames > 0) {
    if (games.A === games.B) {
      parts.push(`${currentSetLabel} ${games.A} ${t('gamesAll', lang)}`);
    } else {
      const leader = games.A > games.B ? 'A' : 'B';
      const trailer = leader === 'A' ? 'B' : 'A';
      parts.push(`${currentSetLabel} ${players[leader].name} ${t('leads', lang)} ${games[leader]}-${games[trailer]}`);
    }
  }

  // 3. Current game points — only if not 0-0 (changeover/new game)
  const isNewGame = !tiebreak && points.A === 0 && points.B === 0;
  const isTiebreakStart = tiebreak && tiebreakPoints.A === 0 && tiebreakPoints.B === 0;

  if (!isNewGame && !isTiebreakStart) {
    if (tiebreak) {
      const pA = tiebreakPoints.A;
      const pB = tiebreakPoints.B;
      if (pA === pB) {
        parts.push(`${t('tiebreak', lang)} ${pA}-${t('all', lang)}`);
      } else {
        parts.push(`${t('tiebreak', lang)} ${Math.max(pA, pB)}-${Math.min(pA, pB)}`);
      }
    } else if (status === 'deuce') {
      parts.push(t('deuce', lang));
    } else if (status === 'advantage_A') {
      parts.push(`${t('advantage', lang)} ${players.A.name}`);
    } else if (status === 'advantage_B') {
      parts.push(`${t('advantage', lang)} ${players.B.name}`);
    } else {
      const serverWord = pointToWord(points[server]);
      const receiverWord = pointToWord(points[server === 'A' ? 'B' : 'A']);
      if (points[server] === points[server === 'A' ? 'B' : 'A']) {
        parts.push(`${serverWord}-${t('all', lang)}`);
      } else {
        parts.push(`${serverWord}-${receiverWord}`);
      }
    }
  }

  // If no sets and no games played, just announce the point score
  if (parts.length === 0) {
    announceScore(state);
    return;
  }

  const announcement = parts.join('... ');
  speak(announcement, 'calm');
}

// Announce match start
export function announceMatchStart(playerA: string, playerB: string, serverName?: string) {
  const lang = getLang();
  const server = serverName || playerA;
  speak(`${playerA} ${t('versus', lang)} ${playerB}... ${server} ${t('toServe', lang)}.`, 'calm');
}
