import { COLORS } from '@/constants/colors';
import { MatchFormatType } from '@/lib/scoring';

/**
 * Status configuration for displaying match state in UI
 */
export interface StatusConfig {
  text: string;
  color: string;
  urgent: boolean;
}

/**
 * Match status types returned by getMatchStatus
 */
export type MatchStatusType = 
  | 'in_progress'
  | 'deuce'
  | 'advantage_A'
  | 'advantage_B'
  | 'set_point_A'
  | 'set_point_B'
  | 'match_point_A'
  | 'match_point_B'
  | 'match_complete';

/**
 * Get display configuration for a match status
 * Returns text, color, and urgency for status banners
 */
export function getStatusConfig(
  status: MatchStatusType | null,
  playerAName: string,
  playerBName: string,
  isTiebreak: boolean
): StatusConfig | null {
  switch (status) {
    case 'deuce':
      return { text: 'DEUCE', color: COLORS.gold, urgent: false };
    case 'advantage_A':
      return { text: `AD ${playerAName}`, color: COLORS.greenAccent, urgent: false };
    case 'advantage_B':
      return { text: `AD ${playerBName}`, color: COLORS.gold, urgent: false };
    case 'set_point_A':
    case 'set_point_B':
      return { text: 'SET POINT', color: COLORS.amber, urgent: true };
    case 'match_point_A':
    case 'match_point_B':
      return { text: 'MATCH POINT', color: COLORS.red, urgent: true };
    case 'match_complete':
      return { text: 'FINAL', color: COLORS.gold, urgent: false };
    default:
      return isTiebreak ? { text: 'TIEBREAK', color: COLORS.gold, urgent: false } : null;
  }
}

/**
 * Format options for match setup selector (ordered by match length)
 */
export const FORMAT_OPTIONS: MatchFormatType[] = [
  'one_set',
  'best_of_3_super',
  'best_of_3',
  'best_of_5',
];
