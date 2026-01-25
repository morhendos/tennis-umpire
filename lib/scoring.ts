// Tennis Scoring Engine

export type Player = 'A' | 'B';
export type PointScore = 0 | 15 | 30 | 40 | 'AD';

export type MatchFormatType = 
  | 'one_set'             // Single set with tiebreak
  | 'best_of_3_super'     // 2 sets, super tiebreak (10 pts) if 1-1
  | 'best_of_3'           // Best of 3 sets with tiebreak in all sets
  | 'best_of_5';          // Best of 5 sets (Grand Slam style)

export interface MatchFormat {
  type: MatchFormatType;   // Format type for display
  setsToWin: number;       // 2 for best of 3, 3 for best of 5
  gamesPerSet: number;     // Usually 6, or 8 for pro set
  tiebreakAt: number;      // Usually 6, or 8 for pro set
  finalSetTiebreak: boolean; // true = tiebreak in final set, false = advantage
  superTiebreak: boolean;  // true = play super tiebreak instead of final set
  superTiebreakPoints: number; // Points to win super tiebreak (usually 10)
}

export interface SetScore {
  A: number;
  B: number;
}

export interface MatchState {
  players: {
    A: { name: string };
    B: { name: string };
  };
  server: Player;
  points: { A: PointScore; B: PointScore };
  games: { A: number; B: number };
  sets: SetScore[];
  tiebreak: boolean;
  tiebreakPoints: { A: number; B: number };
  superTiebreak: boolean;  // Is this a super tiebreak (match tiebreak)?
  matchFormat: MatchFormat;
  isComplete: boolean;
  winner: Player | null;
}

export type MatchStatus = 
  | 'in_progress'
  | 'deuce'
  | 'advantage_A'
  | 'advantage_B'
  | 'game_point_A'
  | 'game_point_B'
  | 'set_point_A'
  | 'set_point_B'
  | 'match_point_A'
  | 'match_point_B'
  | 'match_complete';

// Predefined match formats
export const MATCH_FORMATS: Record<MatchFormatType, MatchFormat> = {
  one_set: {
    type: 'one_set',
    setsToWin: 1,
    gamesPerSet: 6,
    tiebreakAt: 6,
    finalSetTiebreak: true,
    superTiebreak: false,
    superTiebreakPoints: 10,
  },
  best_of_3_super: {
    type: 'best_of_3_super',
    setsToWin: 2,
    gamesPerSet: 6,
    tiebreakAt: 6,
    finalSetTiebreak: true,
    superTiebreak: true,
    superTiebreakPoints: 10,
  },
  best_of_3: {
    type: 'best_of_3',
    setsToWin: 2,
    gamesPerSet: 6,
    tiebreakAt: 6,
    finalSetTiebreak: true,
    superTiebreak: false,
    superTiebreakPoints: 10,
  },
  best_of_5: {
    type: 'best_of_5',
    setsToWin: 3,
    gamesPerSet: 6,
    tiebreakAt: 6,
    finalSetTiebreak: true,
    superTiebreak: false,
    superTiebreakPoints: 10,
  },
};

// Default match format
export const DEFAULT_FORMAT: MatchFormat = MATCH_FORMATS.best_of_3;

// Format display names (ordered by match length)
export const FORMAT_NAMES: Record<MatchFormatType, string> = {
  one_set: '1 Set',
  best_of_3_super: '2 Sets + Super Tiebreak',
  best_of_3: 'Best of 3 Sets',
  best_of_5: 'Best of 5 Sets',
};

// Create initial match state
export function createMatch(
  playerAName: string,
  playerBName: string,
  format: MatchFormat = DEFAULT_FORMAT,
  server: Player = 'A'
): MatchState {
  return {
    players: {
      A: { name: playerAName },
      B: { name: playerBName },
    },
    server: server,
    points: { A: 0, B: 0 },
    games: { A: 0, B: 0 },
    sets: [{ A: 0, B: 0 }],
    tiebreak: false,
    tiebreakPoints: { A: 0, B: 0 },
    superTiebreak: false,
    matchFormat: format,
    isComplete: false,
    winner: null,
  };
}

// Deep clone match state
export function cloneState(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state));
}

// Get opponent
function opponent(player: Player): Player {
  return player === 'A' ? 'B' : 'A';
}

// Switch server
function switchServer(state: MatchState): void {
  state.server = opponent(state.server);
}

// Check if player can win set (or match tiebreak)
function canWinSet(state: MatchState, player: Player): boolean {
  const p = player;
  const o = opponent(player);
  const g = state.games;
  const format = state.matchFormat;

  // In super tiebreak - winning this wins the match
  if (state.superTiebreak) {
    const tp = state.tiebreakPoints;
    const pointsToWin = format.superTiebreakPoints;
    return tp[p] >= pointsToWin - 1 && tp[p] - tp[o] >= 1;
  }

  // In regular tiebreak
  if (state.tiebreak) {
    const tp = state.tiebreakPoints;
    return tp[p] >= 6 && tp[p] - tp[o] >= 1;
  }

  // Normal game - need gamesPerSet+ games and 2 game lead, or at tiebreak point
  if (g[p] >= format.gamesPerSet - 1) {
    if (g[p] - g[o] >= 1) return true; // Will have 2 game lead after winning
  }

  return false;
}

// Check if player can win match
function canWinMatch(state: MatchState, player: Player): boolean {
  // In super tiebreak, winning it wins the match
  if (state.superTiebreak) {
    const tp = state.tiebreakPoints;
    const o = opponent(player);
    const pointsToWin = state.matchFormat.superTiebreakPoints;
    return tp[player] >= pointsToWin - 1 && tp[player] - tp[o] >= 1;
  }

  if (!canWinSet(state, player)) return false;

  const setsWon = countSetsWon(state);
  return setsWon[player] === state.matchFormat.setsToWin - 1;
}

// Count sets won by each player
function countSetsWon(state: MatchState): { A: number; B: number } {
  const result = { A: 0, B: 0 };
  state.sets.forEach((set, index) => {
    // Only count completed sets (not the current one)
    if (index < state.sets.length - 1 || state.isComplete) {
      if (set.A > set.B) result.A++;
      else if (set.B > set.A) result.B++;
    }
  });
  return result;
}

// Win a game
function winGame(state: MatchState, player: Player): void {
  const o = opponent(player);

  state.games[player]++;
  state.points = { A: 0, B: 0 };

  const g = state.games;
  const format = state.matchFormat;

  // Check for set win
  if (g[player] >= format.gamesPerSet) {
    if (g[player] - g[o] >= 2) {
      winSet(state, player);
      return;
    } else if (g[player] === format.tiebreakAt && g[o] === format.tiebreakAt) {
      // Start tiebreak
      state.tiebreak = true;
      state.tiebreakPoints = { A: 0, B: 0 };
      return;
    }
  }

  // Switch server
  switchServer(state);
}

// Win a set
function winSet(state: MatchState, player: Player): void {
  // Record final score of this set
  const currentSet = state.sets[state.sets.length - 1];
  currentSet.A = state.games.A;
  currentSet.B = state.games.B;

  // If was tiebreak, add the extra game
  if (state.tiebreak && !state.superTiebreak) {
    currentSet[player] = state.games[player] + 1;
  }

  // Reset for new set
  state.games = { A: 0, B: 0 };
  state.tiebreak = false;
  state.tiebreakPoints = { A: 0, B: 0 };
  state.superTiebreak = false;

  // Check for match win
  const setsWon = countSetsWon(state);
  // Add this set to the count
  setsWon[player]++;

  if (setsWon[player] >= state.matchFormat.setsToWin) {
    state.isComplete = true;
    state.winner = player;
  } else {
    // Check if we should start a super tiebreak
    const format = state.matchFormat;
    if (format.superTiebreak && setsWon.A === setsWon.B && 
        setsWon.A === format.setsToWin - 1) {
      // Sets are tied at match point (e.g., 1-1 in best of 3)
      // Start super tiebreak instead of new set
      state.tiebreak = true;
      state.superTiebreak = true;
      state.tiebreakPoints = { A: 0, B: 0 };
      // Don't add a new set - super tiebreak is recorded as a "set" with the tiebreak score
      state.sets.push({ A: 0, B: 0 });
    } else {
      // Start new set
      state.sets.push({ A: 0, B: 0 });
    }
    switchServer(state);
  }
}

// Handle tiebreak point (regular or super)
function handleTiebreakPoint(state: MatchState, player: Player): void {
  const o = opponent(player);
  const tp = state.tiebreakPoints;

  tp[player]++;

  // Determine points needed to win
  const pointsToWin = state.superTiebreak 
    ? state.matchFormat.superTiebreakPoints  // Super tiebreak: usually 10
    : 7;  // Regular tiebreak: 7

  // Check for tiebreak win (pointsToWin+ points, 2 ahead)
  if (tp[player] >= pointsToWin && tp[player] - tp[o] >= 2) {
    // For super tiebreak, record the score in the "set"
    if (state.superTiebreak) {
      const currentSet = state.sets[state.sets.length - 1];
      currentSet.A = tp.A;
      currentSet.B = tp.B;
      // Directly complete the match
      state.isComplete = true;
      state.winner = player;
      state.tiebreak = false;
      state.superTiebreak = false;
    } else {
      winSet(state, player);
    }
    return;
  }

  // Switch server: after first point, then every 2 points
  const totalPoints = tp.A + tp.B;
  if (totalPoints === 1 || (totalPoints > 1 && (totalPoints - 1) % 2 === 0)) {
    switchServer(state);
  }
}

// Main function: add a point
export function addPoint(state: MatchState, player: Player): MatchState {
  const newState = cloneState(state);

  if (newState.isComplete) return newState;

  // Tiebreak scoring
  if (newState.tiebreak) {
    handleTiebreakPoint(newState, player);
    return newState;
  }

  const o = opponent(player);
  const p = newState.points;

  // Both at 40 or beyond (deuce situations)
  if (
    (p[player] === 40 || p[player] === 'AD') &&
    (p[o] === 40 || p[o] === 'AD')
  ) {
    if (p[player] === 40 && p[o] === 40) {
      // Deuce -> Advantage
      p[player] = 'AD';
    } else if (p[o] === 'AD') {
      // Opponent had advantage -> Back to deuce
      p[o] = 40;
    } else if (p[player] === 'AD') {
      // Player had advantage -> Wins game
      winGame(newState, player);
    }
  }
  // At 40, next point wins
  else if (p[player] === 40) {
    winGame(newState, player);
  }
  // Normal progression: 0 -> 15 -> 30 -> 40
  else {
    const sequence: PointScore[] = [0, 15, 30, 40];
    const currentIndex = sequence.indexOf(p[player] as 0 | 15 | 30 | 40);
    p[player] = sequence[currentIndex + 1];
  }

  return newState;
}

// Get match status for announcements
export function getMatchStatus(state: MatchState): MatchStatus {
  if (state.isComplete) return 'match_complete';

  const p = state.points;

  // Check for deuce/advantage
  if (!state.tiebreak) {
    if (p.A === 40 && p.B === 40) return 'deuce';
    if (p.A === 'AD') return 'advantage_A';
    if (p.B === 'AD') return 'advantage_B';
  }

  // Check for match/set/game point
  for (const player of ['A', 'B'] as Player[]) {
    if (isMatchPoint(state, player)) return `match_point_${player}` as MatchStatus;
    if (isSetPoint(state, player)) return `set_point_${player}` as MatchStatus;
    if (isGamePoint(state, player)) return `game_point_${player}` as MatchStatus;
  }

  return 'in_progress';
}

// Check if it's game point for a player
function isGamePoint(state: MatchState, player: Player): boolean {
  const p = state.points;
  const o = opponent(player);

  if (state.tiebreak) {
    const tp = state.tiebreakPoints;
    const pointsToWin = state.superTiebreak 
      ? state.matchFormat.superTiebreakPoints 
      : 7;
    // Game point if: at match point threshold-1 AND ahead, OR above threshold and 1 ahead
    return (tp[player] >= pointsToWin - 1 && tp[player] > tp[o]) ||
           (tp[player] >= pointsToWin && tp[player] - tp[o] >= 1);
  }

  if (p[player] === 'AD') return true;
  if (p[player] === 40 && p[o] !== 40 && p[o] !== 'AD') return true;

  return false;
}

// Check if it's set point for a player
function isSetPoint(state: MatchState, player: Player): boolean {
  if (!isGamePoint(state, player)) return false;
  return canWinSet(state, player);
}

// Check if it's match point for a player
function isMatchPoint(state: MatchState, player: Player): boolean {
  if (!isGamePoint(state, player)) return false;
  return canWinMatch(state, player);
}

// Format point for display (e.g., "40 - 30")
export function formatPoints(state: MatchState): string {
  if (state.tiebreak) {
    return `${state.tiebreakPoints.A} - ${state.tiebreakPoints.B}`;
  }
  return `${state.points.A} - ${state.points.B}`;
}

// Format score for announcements
export function formatScoreForSpeech(state: MatchState): string {
  const { players, points, tiebreak, tiebreakPoints, server } = state;
  const serverName = players[server].name;

  if (tiebreak) {
    const pA = tiebreakPoints.A;
    const pB = tiebreakPoints.B;
    if (pA === pB) {
      return `${pA} all`;
    }
    return `${pA} - ${pB}`;
  }

  const pA = points.A;
  const pB = points.B;

  // Special calls
  if (pA === 40 && pB === 40) return 'Deuce';
  if (pA === 'AD') return `Advantage ${players.A.name}`;
  if (pB === 'AD') return `Advantage ${players.B.name}`;

  // Love
  const callA = pA === 0 ? 'Love' : String(pA);
  const callB = pB === 0 ? 'Love' : String(pB);

  if (pA === pB) {
    return `${callA} all`;
  }

  return `${callA} - ${callB}`;
}

// Get sets won count
export function getSetsWon(state: MatchState): { A: number; B: number } {
  const result = { A: 0, B: 0 };
  
  for (let i = 0; i < state.sets.length; i++) {
    const set = state.sets[i];
    // For completed sets or if match is complete
    const isCurrentSet = i === state.sets.length - 1;
    
    if (!isCurrentSet || state.isComplete) {
      if (set.A > set.B) result.A++;
      else if (set.B > set.A) result.B++;
    }
  }
  
  return result;
}
