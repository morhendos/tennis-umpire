import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Pressable,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getMatchStatus, getSetsWon } from '@/lib/scoring';
import { cancelServeTimer } from '@/lib/speech';
import { useColors, AppColors } from '@/constants/colors';
import { AnimatedScore, ServeIndicator, IconButton } from '@/components/ui';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { getStatusConfig, StatusConfig } from '@/lib/matchUtils';
import { useBreakTimerStore, formatBreakTime } from '@/lib/breakTimerStore';

interface MatchScreenProps {
  match: any;
  scorePoint: (player: 'A' | 'B') => void;
  undo: () => void;
  canUndo: boolean;
  audioEnabled: boolean;
  toggleAudio: () => void;
  onResetMatch: () => void;
  flicActive?: boolean;
}

export function MatchScreen({
  match,
  scorePoint,
  undo,
  canUndo,
  audioEnabled,
  toggleAudio,
  onResetMatch,
  flicActive = false,
}: MatchScreenProps) {
  // Keep screen awake during match
  useKeepAwake();

  // Dynamic theme colors
  const c = useColors();

  const [showManualButtons, setShowManualButtons] = useState(false);

  const handleNewMatch = () => {
    if (match.isComplete) {
      onResetMatch();
      return;
    }
    Alert.alert(
      'New Match',
      'Are you sure you want to end the current match and start a new one?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New Match', style: 'destructive', onPress: onResetMatch },
      ]
    );
  };

  const toggleManualButtons = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowManualButtons(prev => !prev);
  };

  const handleScoreboardLongPress = () => {
    console.log('⏭️ Long press: ending break, resuming play');
    cancelServeTimer();
  };

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  const status = getMatchStatus(match);
  const setsWon = getSetsWon(match);
  const statusConfig = getStatusConfig(status, match.players.A.name, match.players.B.name, match.tiebreak);
  const breakSecondsLeft = useBreakTimerStore(s => s.secondsLeft);
  const breakLabel = useBreakTimerStore(s => s.label);

  // ═══════════════════════════════════════════════
  // LANDSCAPE LAYOUT
  // ═══════════════════════════════════════════════
  if (isLandscape) {
    return (
      <ScreenWrapper showCourtLines={false} colors={c}>
        <View style={[styles.landscapeContent, { 
          paddingTop: insets.top + 8, 
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        }]}>
          <View style={styles.landscapeMain}>
            {/* Left: Player A Score Button */}
            {match.isComplete ? (
              <View style={styles.landscapeWinnerSide}>
                {match.winner === 'A' && <Text style={styles.landscapeTrophy}>🏆</Text>}
              </View>
            ) : !flicActive ? (
              <TouchableOpacity
                style={styles.landscapeScoreBtn}
                onPress={() => scorePoint('A')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[c.green, c.greenLight]}
                  style={styles.landscapeScoreBtnGradient}
                >
                  <Text style={[styles.landscapeScoreBtnName, { color: '#ffffff' }]} numberOfLines={1}>
                    {match.players.A.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {/* Center: TV-Style Scoreboard */}
            <Pressable style={styles.landscapeScoreboard} onLongPress={handleScoreboardLongPress}>
              <LinearGradient
                colors={[c.bgCard, c.bgSecondary]}
                style={[styles.landscapeScoreboardGradient, { borderColor: c.muted + '15' }]}
              >
                {/* Status Banner / Break Timer */}
                {breakSecondsLeft !== null ? (
                  <View style={[styles.landscapeStatus, { backgroundColor: c.bgCard, borderColor: c.amber + '40' }]}>
                    <Text style={[styles.landscapeStatusText, { color: c.amber }]}>
                      {breakLabel}  {formatBreakTime(breakSecondsLeft)}
                    </Text>
                  </View>
                ) : statusConfig ? (
                  <View style={[styles.landscapeStatus, { backgroundColor: c.bgCard, borderColor: c.muted + '20' }, statusConfig.urgent && { backgroundColor: c.red + '15', borderColor: c.red + '40' }]}>
                    <Text style={[styles.landscapeStatusText, { color: statusConfig.color }]}>
                      {statusConfig.text}
                    </Text>
                  </View>
                ) : null}

                {/* Header Row */}
                <View style={[styles.lsbHeader, { borderBottomColor: c.muted + '15' }]}>
                  <View style={styles.lsbNameCol} />
                  {match.isComplete ? (
                    match.sets.map((_: any, i: number) => (
                      <Text key={i} style={[styles.lsbSetLabel, { color: c.muted }]}>{i + 1}</Text>
                    ))
                  ) : (
                    <>
                      {match.sets.slice(0, -1).map((_: any, i: number) => (
                        <Text key={i} style={[styles.lsbSetLabel, { color: c.muted }]}>{i + 1}</Text>
                      ))}
                      <Text style={[styles.lsbSetLabel, { color: c.gold }]}>*</Text>
                    </>
                  )}
                  <Text style={[styles.lsbPointsLabel, { color: c.muted }]}>PTS</Text>
                </View>

                {/* Player A Row */}
                <View style={styles.lsbPlayerRow}>
                  <View style={styles.lsbNameCol}>
                    <View style={styles.lsbPlayerInfo}>
                      {match.server === 'A' && <ServeIndicator compact color={c.gold} />}
                      <Text style={[styles.lsbPlayerName, { color: c.white }, match.server !== 'A' && { marginLeft: 18 }]} numberOfLines={1}>
                        {match.players.A.name}
                      </Text>
                    </View>
                  </View>
                  {match.isComplete ? (
                    match.sets.map((set: any, i: number) => (
                      <View key={i} style={styles.lsbSetCol}>
                        <Text style={[styles.lsbSetScore, { color: c.silver }, set.A > set.B && { fontWeight: '700', color: c.white }]}>
                          {set.A}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <>
                      {match.sets.slice(0, -1).map((set: any, i: number) => (
                        <View key={i} style={styles.lsbSetCol}>
                          <Text style={[styles.lsbSetScore, { color: c.silver }, set.A > set.B && { fontWeight: '700', color: c.white }]}>
                            {set.A}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.lsbSetCol}>
                        <Text style={[styles.lsbCurrentGames, { color: c.white }]}>{match.games.A}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.lsbPointsCol}>
                    <LinearGradient
                      colors={[c.greenAccent + '30', c.green + '20']}
                      style={styles.lsbPointsBox}
                    >
                      <Text style={[styles.lsbPoints, { color: c.greenAccent }]}>
                        {match.tiebreak ? match.tiebreakPoints.A : match.points.A}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Divider */}
                <View style={[styles.lsbDivider, { backgroundColor: c.muted + '20' }]} />

                {/* Player B Row */}
                <View style={styles.lsbPlayerRow}>
                  <View style={styles.lsbNameCol}>
                    <View style={styles.lsbPlayerInfo}>
                      {match.server === 'B' && <ServeIndicator compact color={c.gold} />}
                      <Text style={[styles.lsbPlayerName, { color: c.white }, match.server !== 'B' && { marginLeft: 18 }]} numberOfLines={1}>
                        {match.players.B.name}
                      </Text>
                    </View>
                  </View>
                  {match.isComplete ? (
                    match.sets.map((set: any, i: number) => (
                      <View key={i} style={styles.lsbSetCol}>
                        <Text style={[styles.lsbSetScore, { color: c.silver }, set.B > set.A && { fontWeight: '700', color: c.white }]}>
                          {set.B}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <>
                      {match.sets.slice(0, -1).map((set: any, i: number) => (
                        <View key={i} style={styles.lsbSetCol}>
                          <Text style={[styles.lsbSetScore, { color: c.silver }, set.B > set.A && { fontWeight: '700', color: c.white }]}>
                            {set.B}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.lsbSetCol}>
                        <Text style={[styles.lsbCurrentGames, { color: c.white }]}>{match.games.B}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.lsbPointsCol}>
                    <LinearGradient
                      colors={[c.gold + '30', c.goldMuted + '20']}
                      style={styles.lsbPointsBox}
                    >
                      <Text style={[styles.lsbPoints, { color: c.gold }]}>
                        {match.tiebreak ? match.tiebreakPoints.B : match.points.B}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Bottom Controls */}
                <View style={[styles.lsbControls, { borderTopColor: c.muted + '15' }]}>
                  <TouchableOpacity
                    style={[styles.lsbControlBtn, { backgroundColor: c.bgCard, borderColor: c.muted + '30' }, !canUndo && styles.lsbControlBtnDisabled]}
                    onPress={undo}
                    disabled={!canUndo}
                  >
                    <Ionicons name="arrow-undo" size={16} color={canUndo ? c.silver : c.muted} />
                  </TouchableOpacity>
                  {flicActive && !match.isComplete && (
                    <TouchableOpacity
                      style={[styles.lsbControlBtn, { backgroundColor: c.bgCard, borderColor: c.muted + '30' }, showManualButtons && { borderColor: c.gold + '50', backgroundColor: c.gold + '15' }]}
                      onPress={toggleManualButtons}
                    >
                      <Ionicons name="hand-left-outline" size={16} color={showManualButtons ? c.gold : c.silver} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.lsbControlBtn, { backgroundColor: c.bgCard, borderColor: c.muted + '30' }]}
                    onPress={toggleAudio}
                  >
                    <Ionicons 
                      name={audioEnabled ? 'volume-high-outline' : 'volume-mute-outline'} 
                      size={16} 
                      color={c.silver} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.lsbControlBtn, { backgroundColor: c.bgCard, borderColor: c.muted + '30' }]}
                    onPress={handleNewMatch}
                  >
                    <Ionicons name="refresh" size={16} color={c.silver} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Pressable>

            {/* Right: Player B Score Button OR Manual Panel */}
            {match.isComplete ? (
              <View style={styles.landscapeWinnerSide}>
                {match.winner === 'B' && <Text style={styles.landscapeTrophy}>🏆</Text>}
              </View>
            ) : !flicActive ? (
              <TouchableOpacity
                style={styles.landscapeScoreBtn}
                onPress={() => scorePoint('B')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[c.goldMuted, c.gold]}
                  style={styles.landscapeScoreBtnGradient}
                >
                  <Text style={[styles.landscapeScoreBtnName, { color: c.bgPrimary }]} numberOfLines={1}>
                    {match.players.B.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : flicActive && showManualButtons ? (
              <View style={[styles.lsManualPanel, { backgroundColor: c.bgCard, borderColor: c.muted + '15' }]}>
                {/* Player A */}
                <View style={styles.lsmpRow}>
                  <View style={[styles.lsmpDot, { backgroundColor: c.greenAccent }]} />
                  <Text style={[styles.lsmpName, { color: c.white }]} numberOfLines={1}>{match.players.A.name}</Text>
                  <TouchableOpacity style={styles.lsmpAddBtn} onPress={() => scorePoint('A')} activeOpacity={0.7}>
                    <LinearGradient colors={[c.green, c.greenLight]} style={styles.lsmpAddGradient}>
                      <Ionicons name="add" size={18} color="#ffffff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={[styles.lsmpDivider, { backgroundColor: c.muted + '15' }]} />
                {/* Player B */}
                <View style={styles.lsmpRow}>
                  <View style={[styles.lsmpDot, { backgroundColor: c.gold }]} />
                  <Text style={[styles.lsmpName, { color: c.white }]} numberOfLines={1}>{match.players.B.name}</Text>
                  <TouchableOpacity style={styles.lsmpAddBtn} onPress={() => scorePoint('B')} activeOpacity={0.7}>
                    <LinearGradient colors={[c.goldMuted, c.gold]} style={styles.lsmpAddGradient}>
                      <Ionicons name="add" size={18} color={c.bgPrimary} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={[styles.lsmpDivider, { backgroundColor: c.muted + '15' }]} />
                {/* Undo */}
                <TouchableOpacity
                  style={[styles.lsmpUndoBtn, !canUndo && { opacity: 0.4 }]}
                  onPress={undo}
                  disabled={!canUndo}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo" size={14} color={canUndo ? c.silver : c.muted} />
                  <Text style={[styles.lsmpUndoText, { color: canUndo ? c.silver : c.muted }]}>Undo</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════
  // PORTRAIT LAYOUT
  // ═══════════════════════════════════════════════
  return (
    <ScreenWrapper showCourtLines={false} colors={c}>
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
            colors={c}
          />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerLabel, { color: c.greenAccent }]}>LIVE MATCH</Text>
          </View>
          <IconButton 
            icon="settings-outline" 
            onPress={() => router.push('/settings')}
            colors={c}
          />
        </View>

        {/* Status Banner / Break Timer */}
        {breakSecondsLeft !== null ? (
          <View style={[styles.statusBanner, { backgroundColor: c.bgCard, borderColor: c.amber + '40' }]}>
            <Text style={[styles.breakTimerLabel, { color: c.amber }]}>{breakLabel}</Text>
            <Text style={[styles.breakTimerTime, { color: c.amber }]}>{formatBreakTime(breakSecondsLeft)}</Text>
          </View>
        ) : statusConfig ? (
          <View style={[styles.statusBanner, { backgroundColor: c.bgCard, borderColor: c.muted + '20' }, statusConfig.urgent && { backgroundColor: c.red + '15', borderColor: c.red + '40' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          </View>
        ) : null}

        {/* Main Scoreboard */}
        <Pressable style={styles.scoreboardArea} onLongPress={handleScoreboardLongPress}>
          <LinearGradient
            colors={[c.bgCard, c.bgSecondary]}
            style={[styles.scoreboard, { borderColor: c.muted + '15' }]}
          >
            {/* Header Row */}
            <View style={[styles.sbHeader, { borderBottomColor: c.muted + '15' }]}>
              <View style={styles.sbNameCol} />
              <Text style={[styles.sbColLabel, { color: c.muted }]}>SETS</Text>
              <Text style={[styles.sbColLabel, { color: c.muted }]}>GAMES</Text>
              <Text style={[styles.sbColLabelWide, { color: c.muted }]}>POINTS</Text>
            </View>

            {/* Player A */}
            <View style={styles.sbPlayerRow}>
              <View style={styles.sbNameCol}>
                <View style={styles.sbPlayerInfo}>
                  <View style={styles.sbServeArea}>
                    {match.server === 'A' && <ServeIndicator color={c.gold} />}
                  </View>
                  <Text style={[styles.sbPlayerName, { color: c.white }]} numberOfLines={1}>
                    {match.players.A.name}
                  </Text>
                </View>
              </View>
              <View style={styles.sbScoreCol}>
                <Text style={[styles.sbSetScore, { color: c.silver }]}>{setsWon.A}</Text>
              </View>
              <View style={styles.sbScoreCol}>
                <AnimatedScore value={match.games.A} color={c.white} size={32} />
              </View>
              <View style={styles.sbPointsCol}>
                <LinearGradient
                  colors={[c.greenAccent + '30', c.green + '20']}
                  style={styles.sbPointsBox}
                >
                  <AnimatedScore 
                    value={match.tiebreak ? match.tiebreakPoints.A : match.points.A} 
                    color={c.greenAccent}
                    size={36}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Divider */}
            <LinearGradient
              colors={['transparent', c.muted + '40', 'transparent']}
              style={styles.sbDivider}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />

            {/* Player B */}
            <View style={styles.sbPlayerRow}>
              <View style={styles.sbNameCol}>
                <View style={styles.sbPlayerInfo}>
                  <View style={styles.sbServeArea}>
                    {match.server === 'B' && <ServeIndicator color={c.gold} />}
                  </View>
                  <Text style={[styles.sbPlayerName, { color: c.white }]} numberOfLines={1}>
                    {match.players.B.name}
                  </Text>
                </View>
              </View>
              <View style={styles.sbScoreCol}>
                <Text style={[styles.sbSetScore, { color: c.silver }]}>{setsWon.B}</Text>
              </View>
              <View style={styles.sbScoreCol}>
                <AnimatedScore value={match.games.B} color={c.white} size={32} />
              </View>
              <View style={styles.sbPointsCol}>
                <LinearGradient
                  colors={[c.gold + '30', c.goldMuted + '20']}
                  style={styles.sbPointsBox}
                >
                  <AnimatedScore 
                    value={match.tiebreak ? match.tiebreakPoints.B : match.points.B} 
                    color={c.gold}
                    size={36}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* Set History */}
            {((match.isComplete && match.sets.length >= 1) || match.sets.length > 1) && (
              <View style={[styles.setHistoryRow, { borderTopColor: c.muted + '15' }]}>
                {(match.isComplete ? match.sets : match.sets.slice(0, -1)).map((set: any, i: number) => (
                  <View key={i} style={styles.setHistoryItem}>
                    <Text style={[styles.setHistoryTitle, { color: c.muted }]}>SET {i + 1}</Text>
                    <Text style={[styles.setHistoryValue, { color: c.silver }]}>{set.A} - {set.B}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </Pressable>

        {/* Score Area */}
        {match.isComplete ? (
          <View style={styles.winnerArea}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={[styles.winnerText, { color: c.muted }]}>CHAMPION</Text>
            <Text style={[styles.winnerName, { color: c.gold }]}>{match.players[match.winner!].name}</Text>
          </View>
        ) : flicActive && !showManualButtons ? (
          <View style={styles.flicModeArea}>
            <View style={styles.flicModeIndicator}>
              <View style={styles.flicModeDots}>
                <View style={[styles.flicModeDot, { backgroundColor: c.greenAccent }]} />
                <View style={[styles.flicModeDot, { backgroundColor: c.gold }]} />
              </View>
              <Text style={[styles.flicModeText, { color: c.muted }]}>Scoring via Flic</Text>
            </View>
            <TouchableOpacity style={[styles.manualToggle, { backgroundColor: c.bgCard, borderColor: c.muted + '20' }]} onPress={toggleManualButtons} activeOpacity={0.7}>
              <Ionicons name="hand-left-outline" size={14} color={c.muted} />
              <Text style={[styles.manualToggleText, { color: c.muted }]}>Manual scoring</Text>
              <Ionicons name="chevron-down" size={14} color={c.muted} />
            </TouchableOpacity>
          </View>
        ) : flicActive && showManualButtons ? (
          <View style={styles.manualPanelArea}>
            <TouchableOpacity style={styles.manualToggleCollapse} onPress={toggleManualButtons} activeOpacity={0.7}>
              <Ionicons name="hand-left-outline" size={14} color={c.muted} />
              <Text style={[styles.manualToggleText, { color: c.muted }]}>Hide manual scoring</Text>
              <Ionicons name="chevron-up" size={14} color={c.muted} />
            </TouchableOpacity>

            <View style={[styles.manualPanel, { backgroundColor: c.bgCard, borderColor: c.muted + '15' }]}>
              {/* Player A row */}
              <View style={styles.mpRow}>
                <View style={styles.mpPlayerInfo}>
                  <View style={[styles.mpDot, { backgroundColor: c.greenAccent }]} />
                  <Text style={[styles.mpPlayerName, { color: c.white }]} numberOfLines={1}>{match.players.A.name}</Text>
                </View>
                <TouchableOpacity style={styles.mpAddBtn} onPress={() => scorePoint('A')} activeOpacity={0.7}>
                  <LinearGradient colors={[c.green, c.greenLight]} style={styles.mpAddBtnGradient}>
                    <Ionicons name="add" size={20} color="#ffffff" />
                    <Text style={[styles.mpAddBtnText, { color: '#ffffff' }]}>Point</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={[styles.mpDivider, { backgroundColor: c.muted + '15' }]} />

              {/* Player B row */}
              <View style={styles.mpRow}>
                <View style={styles.mpPlayerInfo}>
                  <View style={[styles.mpDot, { backgroundColor: c.gold }]} />
                  <Text style={[styles.mpPlayerName, { color: c.white }]} numberOfLines={1}>{match.players.B.name}</Text>
                </View>
                <TouchableOpacity style={styles.mpAddBtn} onPress={() => scorePoint('B')} activeOpacity={0.7}>
                  <LinearGradient colors={[c.goldMuted, c.gold]} style={styles.mpAddBtnGradient}>
                    <Ionicons name="add" size={20} color={c.bgPrimary} />
                    <Text style={[styles.mpAddBtnText, { color: c.bgPrimary }]}>Point</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Undo */}
              <View style={[styles.mpUndoRow, { borderTopColor: c.muted + '15' }]}>
                <TouchableOpacity
                  style={[styles.mpUndoBtn, !canUndo && styles.mpUndoBtnDisabled]}
                  onPress={undo}
                  disabled={!canUndo}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo" size={16} color={canUndo ? c.silver : c.muted} />
                  <Text style={[styles.mpUndoText, { color: canUndo ? c.silver : c.muted }]}>Undo last point</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* Standard score buttons */
          <View style={styles.btnArea}>
            <TouchableOpacity
              style={styles.scoreBtn}
              onPress={() => scorePoint('A')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[c.green, c.greenLight]}
                style={styles.scoreBtnGradient}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
              >
                <Text style={[styles.scoreBtnName, { color: '#ffffff' }]}>{match.players.A.name}</Text>
                <Text style={[styles.scoreBtnLabel, { color: '#ffffff80' }]}>SCORES</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scoreBtn}
              onPress={() => scorePoint('B')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[c.goldMuted, c.gold]}
                style={styles.scoreBtnGradient}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
              >
                <Text style={[styles.scoreBtnName, { color: c.bgPrimary }]}>
                  {match.players.B.name}
                </Text>
                <Text style={[styles.scoreBtnLabel, { color: c.bgPrimary + 'aa' }]}>
                  SCORES
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={[styles.controlsArea, { backgroundColor: c.bgCard }]}>
          <TouchableOpacity
            style={[styles.controlBtn, !canUndo && styles.controlBtnDisabled]}
            onPress={undo}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="arrow-undo" 
              size={20} 
              color={canUndo ? c.silver : c.muted} 
            />
            <Text style={[styles.controlText, { color: canUndo ? c.silver : c.muted }]}>
              Undo
            </Text>
          </TouchableOpacity>

          <View style={[styles.controlDivider, { backgroundColor: c.muted + '30' }]} />

          <TouchableOpacity 
            style={styles.controlBtn} 
            onPress={handleNewMatch}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={c.silver} />
            <Text style={[styles.controlText, { color: c.silver }]}>New Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

// ═══════════════════════════════════════════════
// STYLES (structural only — colors applied inline)
// ═══════════════════════════════════════════════
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
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
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
  breakTimerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  breakTimerTime: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },

  // Scoreboard
  scoreboardArea: {
    paddingHorizontal: 12,
  },
  scoreboard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sbNameCol: {
    flex: 1,
  },
  sbColLabel: {
    width: 56,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sbColLabelWide: {
    width: 80,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
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
    flex: 1,
  },
  sbScoreCol: {
    width: 56,
    alignItems: 'center',
  },
  sbSetScore: {
    fontSize: 24,
    fontWeight: '300',
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
    gap: 32,
  },
  setHistoryItem: {
    alignItems: 'center',
  },
  setHistoryTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  setHistoryValue: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Flic display mode
  flicModeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  flicModeIndicator: {
    alignItems: 'center',
    gap: 10,
  },
  flicModeDots: {
    flexDirection: 'row',
    gap: 8,
  },
  flicModeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flicModeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  manualToggleCollapse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  manualToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Manual scoring panel
  manualPanelArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  manualPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  mpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mpPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 12,
  },
  mpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mpPlayerName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  mpAddBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mpAddBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 4,
  },
  mpAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mpDivider: {
    height: 1,
  },
  mpUndoRow: {
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
  },
  mpUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mpUndoBtnDisabled: {
    opacity: 0.4,
  },
  mpUndoText: {
    fontSize: 13,
    fontWeight: '500',
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
    marginBottom: 6,
    textAlign: 'center',
  },
  scoreBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    letterSpacing: 4,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 36,
    fontWeight: '700',
  },

  // Controls
  controlsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
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
  },
  controlDivider: {
    width: 1,
    height: 24,
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
    borderRadius: 16,
  },
  landscapeStatus: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  landscapeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Landscape Scoreboard
  lsbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
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
  },
  lsbPointsLabel: {
    width: 56,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
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
  },
  lsbSetCol: {
    width: 36,
    alignItems: 'center',
  },
  lsbSetScore: {
    fontSize: 20,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  lsbCurrentGames: {
    fontSize: 22,
    fontWeight: '700',
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
  lsbPoints: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lsbDivider: {
    height: 1,
    marginVertical: 4,
  },
  lsbControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  lsbControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  lsbControlBtnDisabled: {
    opacity: 0.4,
  },

  // Landscape manual panel
  lsManualPanel: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 8,
  },
  lsmpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lsmpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lsmpName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  lsmpAddBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  lsmpAddGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lsmpDivider: {
    height: 1,
  },
  lsmpUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  lsmpUndoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
