import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Player Name History Store
// ============================================
// Stores recently used player names for quick selection.
// Names are sorted by most recently used. Max 30 names.

const MAX_NAMES = 30;

interface PlayerStore {
  names: string[];
  addName: (name: string) => void;
  removeName: (name: string) => void;
  renameName: (oldName: string, newName: string) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      names: [],

      addName: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const { names } = get();
        // Remove if already exists (will be re-added at top)
        const filtered = names.filter(n => n.toLowerCase() !== trimmed.toLowerCase());
        // Add to front, cap at MAX
        set({ names: [trimmed, ...filtered].slice(0, MAX_NAMES) });
      },

      removeName: (name: string) => {
        set({ names: get().names.filter(n => n !== name) });
      },

      renameName: (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        set({
          names: get().names.map(n => n === oldName ? trimmed : n),
        });
      },
    }),
    {
      name: 'player-names-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
