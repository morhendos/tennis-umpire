import { create } from 'zustand';

// ============================================
// Break Timer Store
// ============================================
// Tracks countdown during changeovers (90s) and set breaks (120s).
// UI subscribes to this store to display the countdown.

interface BreakTimerState {
  secondsLeft: number | null;  // null = no active break
  totalSeconds: number;        // 90 or 120
  label: string;               // "CHANGEOVER" or "SET BREAK"
}

interface BreakTimerActions {
  startTimer: (totalSeconds: number, label: string) => void;
  stopTimer: () => void;
}

let intervalId: NodeJS.Timeout | null = null;

export const useBreakTimerStore = create<BreakTimerState & BreakTimerActions>((set, get) => ({
  secondsLeft: null,
  totalSeconds: 0,
  label: '',

  startTimer: (totalSeconds: number, label: string) => {
    // Clear any existing timer
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    set({ secondsLeft: totalSeconds, totalSeconds, label });

    intervalId = setInterval(() => {
      const { secondsLeft } = get();
      if (secondsLeft === null || secondsLeft <= 1) {
        // Timer finished
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        set({ secondsLeft: null });
      } else {
        set({ secondsLeft: secondsLeft - 1 });
      }
    }, 1000);
  },

  stopTimer: () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    set({ secondsLeft: null });
  },
}));

// Helper to format seconds as M:SS
export function formatBreakTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
