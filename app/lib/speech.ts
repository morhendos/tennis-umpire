import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import { MatchState, getMatchStatus, MatchStatus } from './scoring';
import { useVoiceStore } from './voiceStore';
import { t, LanguageCode } from './translations';

// API URLs
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Currently playing sound
let currentSound: Audio.Sound | null = null;

// Timer for delayed announcements
let serveTimer: NodeJS.Timeout | null = null;

// Debounce timer for rapid scoring
let speakDebounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 300; // Wait 300ms before speaking

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
      staysActiveInBackground: false,
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

// Helper to pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get current language
function getLang(): LanguageCode {
  return useVoiceStore.getState().language as LanguageCode;
}

// Cancel any pending serve announcement
export function cancelServeTimer() {
  if (serveTimer) {
    clearTimeout(serveTimer);
    serveTimer = null;
  }
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

// Stop any currently playing audio
async function stopCurrentAudio() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {
      // Ignore errors when stopping
    }
    currentSound = null;
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
  
  // Stop current audio immediately
  await stopCurrentAudio();
  Speech.stop();
  
  // For regular point scores, debounce to handle rapid tapping
  // Important announcements (game, set, match) play immediately
  if (style === 'score') {
    console.log(`🎤 Debouncing (${DEBOUNCE_MS}ms): "${text}"`);
    speakDebounceTimer = setTimeout(() => {
      speakDebounceTimer = null;
      speakInternal(text, style);
    }, DEBOUNCE_MS);
  } else {
    // Important announcements - play immediately
    await speakInternal(text, style);
  }
}

// Internal speak function - does the actual TTS work
async function speakInternal(text: string, style: AnnouncementStyle): Promise<void> {
  const { 
    settings, 
    googleSettings,
    voiceEngine, 
    elevenLabsApiKey,
    googleApiKey,
  } = useVoiceStore.getState();
  
  console.log(`🎤 Speaking (${voiceEngine}, ${style}): "${text}"`);
  
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
        await speakWithGoogle(ssml, googleSettings, googleApiKey, true);
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
        await speakWithElevenLabs(text, settings, elevenLabsApiKey);
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
async function speakWithGoogle(text: string, settings: any, apiKey: string, isSSML: boolean = false): Promise<void> {
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

  const uri = `data:audio/mp3;base64,${data.audioContent}`;

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true }
  );
  
  console.log('🔊 Playing Google TTS...');

  currentSound = sound;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('✅ Playback finished');
      sound.unloadAsync();
      if (currentSound === sound) {
        currentSound = null;
      }
    }
  });
}

// ElevenLabs TTS
async function speakWithElevenLabs(text: string, settings: any, apiKey: string): Promise<void> {
  console.log('🔄 Calling ElevenLabs API...');
  
  await stopCurrentAudio();

  const lang = getLang();
  const modelId = lang === 'en' ? 'eleven_flash_v2_5' : 'eleven_multilingual_v2';
  
  console.log(`🌍 Using model: ${modelId} for language: ${lang}`);

  const response = await fetch(`${ELEVENLABS_API_URL}/${settings.voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarityBoost,
        style: settings.style,
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
  
  const base64 = arrayBufferToBase64(arrayBuffer);
  const uri = `data:audio/mpeg;base64,${base64}`;

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true }
  );
  
  console.log('🔊 Playing sound...');

  currentSound = sound;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('✅ Playback finished');
      sound.unloadAsync();
      if (currentSound === sound) {
        currentSound = null;
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
  
  Speech.speak(text, options);
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
  cancelServeTimer();
  const lang = getLang();
  
  console.log(`⏱️ Scheduling serve announcement in ${delaySeconds} seconds`);
  
  serveTimer = setTimeout(() => {
    speak(`${t('time', lang)}... ${serverName} ${t('toServe', lang)}`, 'calm');
    serveTimer = null;
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

// Announce match start
export function announceMatchStart(playerA: string, playerB: string, serverName?: string) {
  const lang = getLang();
  const server = serverName || playerA;
  speak(`${playerA} ${t('versus', lang)} ${playerB}. ${server} ${t('toServe', lang)}.`, 'calm');
}
