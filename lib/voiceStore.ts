import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get API keys from environment (via app.config.js extra)
const ENV_ELEVENLABS_KEY = Constants.expoConfig?.extra?.elevenLabsApiKey || '';
const ENV_GOOGLE_TTS_KEY = Constants.expoConfig?.extra?.googleTtsApiKey || '';

export interface VoiceSettings {
  voiceId: string;
  voiceName: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

export interface GoogleVoiceSettings {
  voiceId: string;
  voiceName: string;
  speakingRate: number;
  pitch: number;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

// ElevenLabs voices
export const ELEVENLABS_VOICES = [
  // Male voices
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill (Wise, Mature)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Deep, Authoritative)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Warm, Confident)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum (Intense, Hoarse)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (Articulate)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Well-Rounded)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Deep, Resonant)' },
  { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick (Shouty)' },
  // Female voices
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (Warm, Clear)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Soft, News-Like)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Calm, Expressive)' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy (Pleasant)' },
];

// Google Cloud TTS voices - Neural2 (best quality, reliable)
export const GOOGLE_VOICES = {
  en: [
    // British Neural2 voices
    { id: 'en-GB-Neural2-B', name: 'James (British Male)' },
    { id: 'en-GB-Neural2-D', name: 'Oliver (British Male)' },
    { id: 'en-GB-Neural2-A', name: 'Emma (British Female)' },
    { id: 'en-GB-Neural2-C', name: 'Sophie (British Female)' },
    // American Neural2 voices
    { id: 'en-US-Neural2-D', name: 'Michael (American Male)' },
    { id: 'en-US-Neural2-J', name: 'David (American Male)' },
    { id: 'en-US-Neural2-C', name: 'Jennifer (American Female)' },
    { id: 'en-US-Neural2-H', name: 'Emily (American Female)' },
    // Australian Neural2
    { id: 'en-AU-Neural2-B', name: 'Jack (Australian Male)' },
    { id: 'en-AU-Neural2-D', name: 'Thomas (Australian Male)' },
  ],
  es: [
    { id: 'es-ES-Neural2-B', name: 'Pablo (Spanish Male)' },
    { id: 'es-ES-Neural2-F', name: 'Carlos (Spanish Male)' },
    { id: 'es-ES-Neural2-A', name: 'María (Spanish Female)' },
    { id: 'es-ES-Neural2-C', name: 'Elena (Spanish Female)' },
  ],
  fr: [
    { id: 'fr-FR-Neural2-B', name: 'Pierre (French Male)' },
    { id: 'fr-FR-Neural2-D', name: 'Louis (French Male)' },
    { id: 'fr-FR-Neural2-A', name: 'Claire (French Female)' },
    { id: 'fr-FR-Neural2-C', name: 'Amélie (French Female)' },
  ],
  it: [
    { id: 'it-IT-Neural2-C', name: 'Marco (Italian Male)' },
    { id: 'it-IT-Neural2-A', name: 'Giulia (Italian Female)' },
    { id: 'it-IT-Neural2-B', name: 'Sofia (Italian Female)' },
  ],
};

// Legacy export for compatibility
export const AVAILABLE_VOICES = ELEVENLABS_VOICES;

export const getVoicesForLanguage = (_langCode: string) => {
  return ELEVENLABS_VOICES;
};

export const getGoogleVoicesForLanguage = (langCode: string) => {
  return GOOGLE_VOICES[langCode as keyof typeof GOOGLE_VOICES] || GOOGLE_VOICES.en;
};

export const getDefaultVoiceForLanguage = (_langCode: string) => {
  return ELEVENLABS_VOICES[0];
};

export type VoiceEngine = 'google' | 'elevenlabs' | 'native';

interface VoiceStore {
  settings: VoiceSettings;
  googleSettings: GoogleVoiceSettings;
  language: string;
  audioEnabled: boolean;
  stadiumEcho: boolean;
  echoIntensity: number; // 0-1, controls delay + volume
  voiceEngine: VoiceEngine;
  elevenLabsApiKey: string;
  googleApiKey: string;
  setVoiceId: (voiceId: string) => void;
  setStability: (value: number) => void;
  setSimilarityBoost: (value: number) => void;
  setStyle: (value: number) => void;
  setUseSpeakerBoost: (value: boolean) => void;
  setGoogleVoiceId: (voiceId: string) => void;
  setGoogleSpeakingRate: (value: number) => void;
  setGooglePitch: (value: number) => void;
  setAudioEnabled: (value: boolean) => void;
  setStadiumEcho: (value: boolean) => void;
  setEchoIntensity: (value: number) => void;
  setLanguage: (langCode: string) => void;
  setVoiceEngine: (engine: VoiceEngine) => void;
  setElevenLabsApiKey: (key: string) => void;
  setGoogleApiKey: (key: string) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceId: 'pqHfZKP75CvOlQylNhV4', // Bill
  voiceName: 'Bill (Wise, Mature)',
  stability: 0.5,
  similarityBoost: 0.8,
  style: 0.7,
  useSpeakerBoost: true,
};

const DEFAULT_GOOGLE_SETTINGS: GoogleVoiceSettings = {
  voiceId: 'en-GB-Neural2-B', // James (British Male)
  voiceName: 'James (British Male)',
  speakingRate: 1.0,
  pitch: 0,
};

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      googleSettings: DEFAULT_GOOGLE_SETTINGS,
      language: 'en',
      audioEnabled: true,
      stadiumEcho: false,
      echoIntensity: 0.5,
      voiceEngine: 'google' as VoiceEngine,
      // Use env vars as defaults, can be overridden by user
      elevenLabsApiKey: ENV_ELEVENLABS_KEY,
      googleApiKey: ENV_GOOGLE_TTS_KEY,

      setVoiceId: (voiceId: string) =>
        set((state) => {
          const voice = ELEVENLABS_VOICES.find((v) => v.id === voiceId);
          return {
            settings: {
              ...state.settings,
              voiceId,
              voiceName: voice?.name || 'Unknown',
            },
          };
        }),

      setStability: (value: number) =>
        set((state) => ({
          settings: { ...state.settings, stability: value },
        })),

      setSimilarityBoost: (value: number) =>
        set((state) => ({
          settings: { ...state.settings, similarityBoost: value },
        })),

      setStyle: (value: number) =>
        set((state) => ({
          settings: { ...state.settings, style: value },
        })),

      setUseSpeakerBoost: (value: boolean) =>
        set((state) => ({
          settings: { ...state.settings, useSpeakerBoost: value },
        })),

      setGoogleVoiceId: (voiceId: string) =>
        set((state) => {
          const lang = state.language;
          const voices = GOOGLE_VOICES[lang as keyof typeof GOOGLE_VOICES] || GOOGLE_VOICES.en;
          const voice = voices.find((v) => v.id === voiceId);
          return {
            googleSettings: {
              ...state.googleSettings,
              voiceId,
              voiceName: voice?.name || 'Unknown',
            },
          };
        }),

      setGoogleSpeakingRate: (value: number) =>
        set((state) => ({
          googleSettings: { ...state.googleSettings, speakingRate: value },
        })),

      setGooglePitch: (value: number) =>
        set((state) => ({
          googleSettings: { ...state.googleSettings, pitch: value },
        })),

      setAudioEnabled: (value: boolean) => set({ audioEnabled: value }),

      setStadiumEcho: (value: boolean) => set({ stadiumEcho: value }),

      setEchoIntensity: (value: number) => set({ echoIntensity: value }),

      setLanguage: (langCode: string) => {
        // Update Google voice to match new language
        const voices = GOOGLE_VOICES[langCode as keyof typeof GOOGLE_VOICES] || GOOGLE_VOICES.en;
        const defaultVoice = voices[0];
        set((state) => ({
          language: langCode,
          googleSettings: {
            ...state.googleSettings,
            voiceId: defaultVoice.id,
            voiceName: defaultVoice.name,
          },
        }));
      },

      setVoiceEngine: (engine: VoiceEngine) => set({ voiceEngine: engine }),

      setElevenLabsApiKey: (key: string) => set({ elevenLabsApiKey: key }),

      setGoogleApiKey: (key: string) => set({ googleApiKey: key }),

      resetToDefaults: () => set({ 
        settings: DEFAULT_SETTINGS,
        googleSettings: DEFAULT_GOOGLE_SETTINGS,
        language: 'en',
        voiceEngine: 'google',
        // Reset to env vars, not empty strings
        elevenLabsApiKey: ENV_ELEVENLABS_KEY,
        googleApiKey: ENV_GOOGLE_TTS_KEY,
      }),
    }),
    {
      name: 'voice-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Merge persisted state with env vars - env vars take precedence if persisted value is empty
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<VoiceStore>;
        return {
          ...currentState,
          ...persisted,
          // If persisted key is empty but env var exists, use env var
          elevenLabsApiKey: persisted?.elevenLabsApiKey || ENV_ELEVENLABS_KEY,
          googleApiKey: persisted?.googleApiKey || ENV_GOOGLE_TTS_KEY,
        };
      },
    }
  )
);
