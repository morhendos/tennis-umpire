import { useState, useCallback } from 'react';
import {
  MatchState,
  MatchFormat,
  MatchFormatType,
  Player,
  createMatch,
  addPoint,
  cloneState,
  DEFAULT_FORMAT,
  MATCH_FORMATS,
  getMatchStatus,
} from './scoring';
import {
  announceScore,
  announceGameWon,
  announceSetWon,
  announceStatus,
  announceTiebreak,
  announceSuperTiebreak,
  announceMatchStart,
  cancelServeTimer,
} from './speech';
import { useVoiceStore } from './voiceStore';

const MAX_HISTORY = 50;

interface UseMatchReturn {
  match: MatchState | null;
  history: MatchState[];
  audioEnabled: boolean;
  
  // Actions
  startMatch: (playerA: string, playerB: string, server: Player, formatType?: MatchFormatType) => void;
  scorePoint: (player: Player) => void;
  undo: () => void;
  resetMatch: () => void;
  toggleAudio: () => void;
  
  // State
  canUndo: boolean;
}

export function useMatch(): UseMatchReturn {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [history, setHistory] = useState<MatchState[]>([]);
  const { audioEnabled, setAudioEnabled } = useVoiceStore();

  const startMatch = useCallback(
    (playerA: string, playerB: string, server: Player = 'A', formatType: MatchFormatType = 'best_of_3') => {
      cancelServeTimer(); // Cancel any pending announcements
      const format = MATCH_FORMATS[formatType];
      const newMatch = createMatch(playerA, playerB, format, server);
      setMatch(newMatch);
      setHistory([]);
      
      // Announce match start - announce the server
      const serverName = server === 'A' ? playerA : playerB;
      setTimeout(() => {
        announceMatchStart(playerA, playerB, serverName);
      }, 500);
    },
    []
  );

  const scorePoint = useCallback(
    (player: Player) => {
      if (!match || match.isComplete) return;

      // Cancel any pending serve announcement (player scored before timer)
      cancelServeTimer();

      // Save current state to history before changing
      const previousState = cloneState(match);
      setHistory((prev) => {
        const newHistory = [...prev, previousState];
        if (newHistory.length > MAX_HISTORY) {
          return newHistory.slice(-MAX_HISTORY);
        }
        return newHistory;
      });

      // Apply the point
      const newState = addPoint(match, player);
      setMatch(newState);

      // Handle announcements
      const prevGamesA = previousState.games.A;
      const prevGamesB = previousState.games.B;
      const prevSetsCount = previousState.sets.length;
      const prevTiebreak = previousState.tiebreak;
      
      const newGamesA = newState.games.A;
      const newGamesB = newState.games.B;
      const newSetsCount = newState.sets.length;
      const newTiebreak = newState.tiebreak;

      // Check what happened
      const status = getMatchStatus(newState);

      // Match complete
      if (status === 'match_complete') {
        setTimeout(() => {
          announceScore(newState);
        }, 300);
        return;
      }

      // Set won (new set started)
      if (newSetsCount > prevSetsCount) {
        setTimeout(() => {
          const finalSetScore = {
            A: prevTiebreak ? prevGamesA + (previousState.tiebreakPoints.A > previousState.tiebreakPoints.B ? 1 : 0) : prevGamesA + (player === 'A' ? 1 : 0),
            B: prevTiebreak ? prevGamesB + (previousState.tiebreakPoints.B > previousState.tiebreakPoints.A ? 1 : 0) : prevGamesB + (player === 'B' ? 1 : 0),
          };
          announceSetWon(player, finalSetScore, newState);
        }, 300);
        return;
      }

      // Tiebreak started
      if (newTiebreak && !prevTiebreak) {
        setTimeout(() => {
          // Check if it's a super tiebreak (match tiebreak)
          if (newState.superTiebreak) {
            announceSuperTiebreak();
          } else {
            announceTiebreak();
          }
        }, 300);
        return;
      }

      // Game won (games changed)
      if (newGamesA !== prevGamesA || newGamesB !== prevGamesB) {
        setTimeout(() => {
          announceGameWon(player, newState);
        }, 300);
        return;
      }

      // Check for match/set point before announcing score
      if (status === 'match_point_A' || status === 'match_point_B' ||
          status === 'set_point_A' || status === 'set_point_B') {
        setTimeout(() => {
          announceStatus(status, newState);
        }, 300);
        return;
      }

      // Regular point - announce score
      setTimeout(() => {
        announceScore(newState);
      }, 300);
    },
    [match]
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;

    cancelServeTimer(); // Cancel any pending announcements
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setMatch(previousState);

    // Announce the restored score
    if (audioEnabled) {
      setTimeout(() => {
        announceScore(previousState);
      }, 300);
    }
  }, [history, audioEnabled]);

  const resetMatch = useCallback(() => {
    cancelServeTimer(); // Cancel any pending announcements
    setMatch(null);
    setHistory([]);
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(!audioEnabled);
  }, [audioEnabled, setAudioEnabled]);

  return {
    match,
    history,
    audioEnabled,
    startMatch,
    scorePoint,
    undo,
    resetMatch,
    toggleAudio,
    canUndo: history.length > 0,
  };
}
