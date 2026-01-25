import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VoiceSettings {
  voiceId: string;
  voiceName: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speakerBoost: boolean;
}

interface SettingsState {
  voiceSettings: VoiceSettings;
  useElevenLabs: boolean;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setUseElevenLabs: (value: boolean) => void;
}

// Available voices
export const VOICES = [
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (British Male)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (British Female)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (British Male)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (American Male)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (American Female)' },
];

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
  voiceName: 'Daniel (British Male)',
  stability: 0.5,
  similarityBoost: 0.8,
  style: 0.7,
  speakerBoost: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      voiceSettings: DEFAULT_SETTINGS,
      useElevenLabs: true,
      
      setVoiceSettings: (settings) =>
        set((state) => ({
          voiceSettings: { ...state.voiceSettings, ...settings },
        })),
      
      setUseElevenLabs: (value) => set({ useElevenLabs: value }),
    }),
    {
      name: 'tennis-umpire-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
