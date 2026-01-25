import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getMatchStatus, getSetsWon } from '@/lib/scoring';
import { COLORS } from '@/constants/colors';
import { AnimatedScore, ServeIndicator, IconButton } from '@/components/ui';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { getStatusConfig, StatusConfig } from '@/lib/matchUtils';

interface MatchScreenProps {
  match: any; // Match type from useMatch
  scorePoint: (player: 'A' | 'B') => void;
  undo: () => void;
  canUndo: boolean;
  audioEnabled: boolean;
  toggleAudio: () => void;
  onResetMatch: () => void;
}

export function MatchScreen({
  match,
  scorePoint,
  undo,
  canUndo,
  audioEnabled,
  toggleAudio,
  onResetMatch,
}: MatchScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  const status = getMatchStatus(match);
  const setsWon = getSetsWon(match);
  const statusConfig = getStatusConfig(status, match.players.A.name, match.players.B.name, match.tiebreak);

  // LANDSCAPE LAYOUT - TV-style horizontal scoreboard
  if (isLandscape) {
    return (
      <ScreenWrapper showCourtLines={false}>
        <View style={[styles.landscapeContent, { 
          paddingTop: insets.top + 8, 
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        }]}>
          <View style={styles.landscapeMain}>
            {/* Left: Player A Score Button */}
            {!match.isComplete ? (
              <TouchableOpacity
                style={styles.landscapeScoreBtn}
                onPress={() => scorePoint('A')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.green, COLORS.greenLight]}
                  style={styles.landscapeScoreBtnGradient}
                >
                  <Text style={styles.landscapeScoreBtnName} numberOfLines={1}>
                    {match.players.A.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.landscapeWinnerSide}>
                {match.winner === 'A' && <Text style={styles.landscapeTrophy}>🏆</Text>}
              </View>
            )}

            {/* Center: TV-Style Scoreboard */}
            <View style={styles.landscapeScoreboard}>
              <LinearGradient
                colors={[COLORS.bgCard, COLORS.bgSecondary]}
                style={styles.landscapeScoreboardGradient}
              >
                {/* Status Banner */}
                {statusConfig && (
                  <View style={[styles.landscapeStatus, statusConfig.urgent && styles.landscapeStatusUrgent]}>
                    <Text style={[styles.landscapeStatusText, { color: statusConfig.color }]}>
                      {statusConfig.text}
                    </Text>
                  </View>
                )}

                {/* Header Row */}
                <View style={styles.lsbHeader}>
                  <View style={styles.lsbNameCol} />
                  {match.isComplete ? (
                    match.sets.map((_: any, i: number) => (
                      <Text key={i} style={styles.lsbSetLabel}>{i + 1}</Text>
                    ))
                  ) : (
                    <>
                      {match.sets.slice(0, -1).map((_: any, i: number) => (
                        <Text key={i} style={styles.lsbSetLabel}>{i + 1}</Text>
                      ))}
                      <Text style={styles.lsbSetLabelCurrent}>*</Text>
                    </>
                  )}
                  <Text style={styles.lsbPointsLabel}>PTS</Text>
                </View>

                {/* Player A Row */}
                <View style={styles.lsbPlayerRow}>
                  <View style={styles.lsbNameCol}>
                    <View style={styles.lsbPlayerInfo}>
                      {match.server === 'A' && <ServeIndicator compact />}
                      <Text style={[styles.lsbPlayerName, match.server !== 'A' && { marginLeft: 18 }]} numberOfLines={1}>
                        {match.players.A.name}
                      </Text>
                    </View>
                  </View>
                  {match.isComplete ? (
                    match.sets.map((set: any, i: number) => (
                      <View key={i} style={styles.lsbSetCol}>
                        <Text style={[styles.lsbSetScore, set.A > set.B && styles.lsbSetScoreWinner]}>
                          {set.A}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <>
                      {match.sets.slice(0, -1).map((set: any, i: number) => (
                        <View key={i} style={styles.lsbSetCol}>
                          <Text style={[styles.lsbSetScore, set.A > set.B && styles.lsbSetScoreWinner]}>
                            {set.A}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.lsbSetColCurrent}>
                        <Text style={styles.lsbCurrentGames}>{match.games.A}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.lsbPointsCol}>
                    <LinearGradient
                      colors={[COLORS.greenAccent + '30', COLORS.green + '20']}
                      style={styles.lsbPointsBox}
                    >
                      <Text style={styles.lsbPointsA}>
                        {match.tiebreak ? match.tiebreakPoints.A : match.points.A}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.lsbDivider} />

                {/* Player B Row */}
                <View style={styles.lsbPlayerRow}>
                  <View style={styles.lsbNameCol}>
                    <View style={styles.lsbPlayerInfo}>
                      {match.server === 'B' && <ServeIndicator compact />}
                      <Text style={[styles.lsbPlayerName, match.server !== 'B' && { marginLeft: 18 }]} numberOfLines={1}>
                        {match.players.B.name}
                      </Text>
                    </View>
                  </View>
                  {match.isComplete ? (
                    match.sets.map((set: any, i: number) => (
                      <View key={i} style={styles.lsbSetCol}>
                        <Text style={[styles.lsbSetScore, set.B > set.A && styles.lsbSetScoreWinner]}>
                          {set.B}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <>
                      {match.sets.slice(0, -1).map((set: any, i: number) => (
                        <View key={i} style={styles.lsbSetCol}>
                          <Text style={[styles.lsbSetScore, set.B > set.A && styles.lsbSetScoreWinner]}>
                            {set.B}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.lsbSetColCurrent}>
                        <Text style={styles.lsbCurrentGames}>{match.games.B}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.lsbPointsCol}>
                    <LinearGradient
                      colors={[COLORS.gold + '30', COLORS.goldMuted + '20']}
                      style={styles.lsbPointsBox}
                    >
                      <Text style={styles.lsbPointsB}>
                        {match.tiebreak ? match.tiebreakPoints.B : match.points.B}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Bottom Controls */}
                <View style={styles.lsbControls}>
                  <TouchableOpacity
                    style={[styles.lsbControlBtn, !canUndo && styles.lsbControlBtnDisabled]}
                    onPress={undo}
                    disabled={!canUndo}
                  >
                    <Ionicons name="arrow-undo" size={16} color={canUndo ? COLORS.silver : COLORS.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.lsbControlBtn}
                    onPress={toggleAudio}
                  >
                    <Ionicons 
                      name={audioEnabled ? 'volume-high-outline' : 'volume-mute-outline'} 
                      size={16} 
                      color={COLORS.silver} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.lsbControlBtn}
                    onPress={onResetMatch}
                  >
                    <Ionicons name="refresh" size={16} color={COLORS.silver} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Right: Player B Score Button */}
            {!match.isComplete ? (
              <TouchableOpacity
                style={styles.landscapeScoreBtn}
                onPress={() => scorePoint('B')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.goldMuted, COLORS.gold]}
                  style={styles.landscapeScoreBtnGradient}
                >
                  <Text style={[styles.landscapeScoreBtnName, { color: COLORS.bgPrimary }]} numberOfLines={1}>
                    {match.players.B.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.landscapeWinnerSide}>
                {match.winner === 'B' && <Text style={styles.landscapeTrophy}>🏆</Text>}
              </View>
            )}
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // PORTRAIT LAYOUT
  return (
    <ScreenWrapper showCourtLines={false}>
      <View style={[styles.safeContent, { 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom + 8,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }]}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton 
            icon={audioEnabled ? 'volume-high-outline' : 'volume-mute-outline'} 
            onPress={toggleAudio} 
          />

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>LIVE MATCH</Text>
          </View>

          <IconButton 
            icon="settings-outline" 
            onPress={() => router.push('/settings')} 
          />
        </View>

        {/* Status Banner */}
        {statusConfig && (
          <View style={[styles.statusBanner, statusConfig.urgent && styles.statusUrgent]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          </View>
        )}

        {/* Main Scoreboard */}
        <View style={styles.scoreboardArea}>
          <LinearGradient
            colors={[COLORS.bgCard, COLORS.bgSecondary]}
            style={styles.scoreboard}
          >
            {/* Header Row */}
            <View style={styles.sbHeader}>
              <View style={styles.sbNameCol} />
              <Text style={styles.sbColLabel}>SETS</Text>
              <Text style={styles.sbColLabel}>GAMES</Text>
              <Text style={styles.sbColLabelWide}>POINTS</Text>
            </View>

            {/* Player A */}
            <View style={styles.sbPlayerRow}>
              <View style={styles.sbNameCol}>
                <View style={styles.sbPlayerInfo}>
                  <View style={styles.sbServeArea}>
                    {match.server === 'A' && <ServeIndicator />}
                  </View>
                  <Text style={styles.sbPlayerName} numberOfLines={1}>
                    {match.players.A.name}
                  </Text>
                </View>
              </View>
              <View style={styles.sbScoreCol}>
                <Text style={styles.sbSetScore}>{setsWon.A}</Text>
              </View>
              <View style={styles.sbScoreCol}>
                <AnimatedScore value={match.games.A} color={COLORS.white} size={32} />
              </View>
              <View style={styles.sbPointsCol}>
                <LinearGradient
                  colors={[COLORS.greenAccent + '30', COLORS.green + '20']}
                  style={styles.sbPointsBox}
                >
                  <AnimatedScore 
                    value={match.tiebreak ? match.tiebreakPoints.A : match.points.A} 
                    color={COLORS.greenAccent}
                    size={36}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Divider */}
            <LinearGradient
              colors={['transparent', COLORS.muted + '40', 'transparent']}
              style={styles.sbDivider}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />

            {/* Player B */}
            <View style={styles.sbPlayerRow}>
              <View style={styles.sbNameCol}>
                <View style={styles.sbPlayerInfo}>
                  <View style={styles.sbServeArea}>
                    {match.server === 'B' && <ServeIndicator />}
                  </View>
                  <Text style={styles.sbPlayerName} numberOfLines={1}>
                    {match.players.B.name}
                  </Text>
                </View>
              </View>
              <View style={styles.sbScoreCol}>
                <Text style={styles.sbSetScore}>{setsWon.B}</Text>
              </View>
              <View style={styles.sbScoreCol}>
                <AnimatedScore value={match.games.B} color={COLORS.white} size={32} />
              </View>
              <View style={styles.sbPointsCol}>
                <LinearGradient
                  colors={[COLORS.gold + '30', COLORS.goldMuted + '20']}
                  style={styles.sbPointsBox}
                >
                  <AnimatedScore 
                    value={match.tiebreak ? match.tiebreakPoints.B : match.points.B} 
                    color={COLORS.gold}
                    size={36}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Set History */}
            {((match.isComplete && match.sets.length >= 1) || match.sets.length > 1) && (
              <View style={styles.setHistoryRow}>
                {(match.isComplete ? match.sets : match.sets.slice(0, -1)).map((set: any, i: number) => (
                  <View key={i} style={styles.setHistoryItem}>
                    <Text style={styles.setHistoryTitle}>SET {i + 1}</Text>
                    <Text style={styles.setHistoryValue}>{set.A} - {set.B}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Score Buttons */}
        {!match.isComplete ? (
          <View style={styles.btnArea}>
            <TouchableOpacity
              style={styles.scoreBtn}
              onPress={() => scorePoint('A')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.green, COLORS.greenLight]}
                style={styles.scoreBtnGradient}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
              >
                <Text style={styles.scoreBtnName}>{match.players.A.name}</Text>
                <Text style={styles.scoreBtnLabel}>SCORES</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scoreBtn}
              onPress={() => scorePoint('B')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.goldMuted, COLORS.gold]}
                style={styles.scoreBtnGradient}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
              >
                <Text style={[styles.scoreBtnName, { color: COLORS.bgPrimary }]}>
                  {match.players.B.name}
                </Text>
                <Text style={[styles.scoreBtnLabel, { color: COLORS.bgPrimary + 'aa' }]}>
                  SCORES
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.winnerArea}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={styles.winnerText}>CHAMPION</Text>
            <Text style={styles.winnerName}>{match.players[match.winner!].name}</Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controlsArea}>
          <TouchableOpacity
            style={[styles.controlBtn, !canUndo && styles.controlBtnDisabled]}
            onPress={undo}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="arrow-undo" 
              size={20} 
              color={canUndo ? COLORS.silver : COLORS.muted} 
            />
            <Text style={[styles.controlText, !canUndo && styles.controlTextDisabled]}>
              Undo
            </Text>
          </TouchableOpacity>

          <View style={styles.controlDivider} />

          <TouchableOpacity 
            style={styles.controlBtn} 
            onPress={onResetMatch}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={COLORS.silver} />
            <Text style={styles.controlText}>New Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeContent: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenAccent,
    letterSpacing: 3,
  },

  // Status
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  statusUrgent: {
    backgroundColor: COLORS.red + '15',
    borderColor: COLORS.red + '40',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },

  // Scoreboard
  scoreboardArea: {
    paddingHorizontal: 12,
  },
  scoreboard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.muted + '15',
  },
  sbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted + '15',
  },
  sbNameCol: {
    flex: 1,
  },
  sbColLabel: {
    width: 56,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1,
  },
  sbColLabelWide: {
    width: 80,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1,
  },

  // Player rows
  sbPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sbPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sbServeArea: {
    width: 24,
    height: 24,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sbPlayerName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  sbScoreCol: {
    width: 56,
    alignItems: 'center',
  },
  sbSetScore: {
    fontSize: 24,
    fontWeight: '300',
    color: COLORS.silver,
  },
  sbPointsCol: {
    width: 80,
    alignItems: 'center',
  },
  sbPointsBox: {
    width: 68,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sbDivider: {
    height: 1,
    marginVertical: 8,
  },

  // Set history
  setHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.muted + '15',
    gap: 32,
  },
  setHistoryItem: {
    alignItems: 'center',
  },
  setHistoryTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  setHistoryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.silver,
  },

  // Score buttons
  btnArea: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  scoreBtn: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scoreBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scoreBtnName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  scoreBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white + '80',
    letterSpacing: 3,
  },

  // Winner
  winnerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trophyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 4,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.gold,
  },

  // Controls
  controlsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 4,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.silver,
  },
  controlTextDisabled: {
    color: COLORS.muted,
  },
  controlDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.muted + '30',
  },

  // ==========================================
  // LANDSCAPE STYLES
  // ==========================================
  landscapeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  landscapeMain: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    height: '100%',
    maxHeight: 280,
  },
  landscapeScoreBtn: {
    width: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  landscapeScoreBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  landscapeScoreBtnName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  landscapeWinnerSide: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeTrophy: {
    fontSize: 48,
  },
  landscapeScoreboard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  landscapeScoreboardGradient: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.muted + '15',
    borderRadius: 16,
  },
  landscapeStatus: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  landscapeStatusUrgent: {
    backgroundColor: COLORS.red + '15',
    borderColor: COLORS.red + '40',
  },
  landscapeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Landscape Scoreboard (lsb) styles
  lsbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted + '15',
  },
  lsbNameCol: {
    flex: 1,
    minWidth: 100,
  },
  lsbSetLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  lsbSetLabelCurrent: {
    width: 36,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gold,
  },
  lsbPointsLabel: {
    width: 56,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  lsbPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  lsbPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lsbPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  lsbSetCol: {
    width: 36,
    alignItems: 'center',
  },
  lsbSetScore: {
    fontSize: 20,
    fontWeight: '400',
    color: COLORS.silver,
    fontVariant: ['tabular-nums'],
  },
  lsbSetScoreWinner: {
    fontWeight: '700',
    color: COLORS.white,
  },
  lsbSetColCurrent: {
    width: 36,
    alignItems: 'center',
  },
  lsbCurrentGames: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  lsbPointsCol: {
    width: 56,
    alignItems: 'center',
  },
  lsbPointsBox: {
    width: 48,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lsbPointsA: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.greenAccent,
    fontVariant: ['tabular-nums'],
  },
  lsbPointsB: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },
  lsbDivider: {
    height: 1,
    backgroundColor: COLORS.muted + '20',
    marginVertical: 4,
  },
  lsbControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.muted + '15',
  },
  lsbControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.muted + '30',
  },
  lsbControlBtnDisabled: {
    opacity: 0.4,
  },
});
