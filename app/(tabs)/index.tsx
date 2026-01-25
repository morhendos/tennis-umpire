import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Image,
  useWindowDimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMatch } from '@/lib/useMatch';
import { getMatchStatus, getSetsWon, MatchFormatType, FORMAT_NAMES } from '@/lib/scoring';
import { COLORS } from '@/constants/colors';
import { AnimatedScore, ServeIndicator, IconButton } from '@/components/ui';
import { CoinFlip } from '@/components/CoinFlip';

const { width, height } = Dimensions.get('window');

export default function ScoreboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const { match, startMatch, scorePoint, undo, resetMatch, canUndo, audioEnabled, toggleAudio } = useMatch();
  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormatType>('best_of_3');
  const [setupStep, setSetupStep] = useState<'players' | 'format'>('players');
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Format options for the selector (ordered by match length)
  const formatOptions: MatchFormatType[] = ['one_set', 'best_of_3_super', 'best_of_3', 'best_of_5'];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBeginMatch = () => {
    setShowCoinFlip(true);
  };

  const handleNextStep = () => {
    setSetupStep('format');
  };

  const handleBackStep = () => {
    setSetupStep('players');
  };

  const handleResetMatch = () => {
    resetMatch();
    setSetupStep('players');
  };

  const handleCoinFlipComplete = (server: 'A' | 'B') => {
    setShowCoinFlip(false);
    startMatch(playerAName.trim(), playerBName.trim(), server, selectedFormat);
  };

  // Coin Flip Screen
  if (showCoinFlip) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Decorative court lines */}
        <View style={styles.courtLines}>
          <View style={styles.courtLineH} />
          <View style={styles.courtLineV} />
        </View>

        <View style={[styles.safeContent, { 
          paddingTop: insets.top, 
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }]}>
          <CoinFlip 
            playerA={playerAName.trim()} 
            playerB={playerBName.trim()} 
            onComplete={handleCoinFlipComplete}
          />
        </View>
      </View>
    );
  }

  // Setup Screen - Step 1: Players
  if (!match && setupStep === 'players') {
    const canProceed = playerAName.trim().length > 0 && playerBName.trim().length > 0;
    
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        
        <View style={styles.courtLines}>
          <View style={styles.courtLineH} />
          <View style={styles.courtLineV} />
        </View>

        <KeyboardAvoidingView 
          style={styles.safeContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.topBarSpacer} />
            <IconButton 
              icon="settings-outline" 
              onPress={() => router.push('/settings')} 
            />
          </View>

          <ScrollView 
            contentContainerStyle={styles.setupScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.setupContent, { opacity: fadeAnim }]}>
              {/* Logo */}
              <View style={styles.logoArea}>
                <View style={styles.logoCircle}>
                  <Image 
                    source={require('@/assets/images/ball03.png')} 
                    style={styles.logoImage}
                  />
                </View>
                <Text style={styles.logoText}>TENNIS</Text>
                <View style={styles.logoLine} />
                <Text style={styles.logoSubtext}>UMPIRE</Text>
              </View>

              {/* Input Fields */}
              <View style={styles.inputArea}>
                <View style={styles.inputRow}>
                  <View style={styles.inputBorder}>
                    <LinearGradient
                      colors={[COLORS.greenAccent, COLORS.green]}
                      style={styles.inputGradientBorder}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.inputInner}>
                        <Text style={styles.inputLabel}>PLAYER 1</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter name"
                          placeholderTextColor={COLORS.muted}
                          value={playerAName}
                          onChangeText={setPlayerAName}
                          autoCapitalize="words"
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.vsSection}>
                  <View style={styles.vsLineLeft} />
                  <View style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <View style={styles.vsLineRight} />
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputBorder}>
                    <LinearGradient
                      colors={[COLORS.gold, COLORS.goldMuted]}
                      style={styles.inputGradientBorder}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.inputInner}>
                        <Text style={styles.inputLabel}>PLAYER 2</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter name"
                          placeholderTextColor={COLORS.muted}
                          value={playerBName}
                          onChangeText={setPlayerBName}
                          autoCapitalize="words"
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              </View>

              {/* Next Button */}
              <TouchableOpacity
                style={[styles.startBtn, !canProceed && styles.startBtnDisabled]}
                onPress={handleNextStep}
                disabled={!canProceed}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={canProceed ? [COLORS.greenLight, COLORS.green] : [COLORS.muted, COLORS.muted]}
                  style={styles.startBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.startBtnText}>NEXT</Text>
                  <Feather name="arrow-right" size={20} color={COLORS.white} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            
            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Setup Screen - Step 2: Match Format
  if (!match && setupStep === 'format') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        
        <View style={styles.courtLines}>
          <View style={styles.courtLineH} />
          <View style={styles.courtLineV} />
        </View>

        <View style={[styles.safeContent, { 
          paddingTop: insets.top, 
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }]}>
          {/* Back Button */}
          <View style={styles.topBar}>
            <IconButton 
              icon="arrow-back" 
              onPress={handleBackStep} 
            />
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.formatStepContent}>
            {/* Players Summary */}
            <View style={styles.playersSummary}>
              <View style={styles.playerSummaryItem}>
                <View style={[styles.playerDot, { backgroundColor: COLORS.greenAccent }]} />
                <Text style={styles.playerSummaryName}>{playerAName.trim()}</Text>
              </View>
              <Text style={styles.playerSummaryVs}>vs</Text>
              <View style={styles.playerSummaryItem}>
                <View style={[styles.playerDot, { backgroundColor: COLORS.gold }]} />
                <Text style={styles.playerSummaryName}>{playerBName.trim()}</Text>
              </View>
            </View>

            {/* Format Title */}
            <Text style={styles.formatStepTitle}>SELECT FORMAT</Text>
            <Text style={styles.formatStepSubtitle}>How long should the match be?</Text>

            {/* Format Options - Vertical List */}
            <View style={styles.formatList}>
              {formatOptions.map((format) => (
                <TouchableOpacity
                  key={format}
                  style={[
                    styles.formatListItem,
                    selectedFormat === format && styles.formatListItemSelected,
                  ]}
                  onPress={() => setSelectedFormat(format)}
                  activeOpacity={0.7}
                >
                  <View style={styles.formatListContent}>
                    <View style={[
                      styles.formatRadio,
                      selectedFormat === format && styles.formatRadioSelected,
                    ]}>
                      {selectedFormat === format && <View style={styles.formatRadioDot} />}
                    </View>
                    <Text
                      style={[
                        styles.formatListText,
                        selectedFormat === format && styles.formatListTextSelected,
                      ]}
                    >
                      {FORMAT_NAMES[format]}
                    </Text>
                  </View>
                  {selectedFormat === format && (
                    <Ionicons name="checkmark" size={20} color={COLORS.greenAccent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleBeginMatch}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.greenLight, COLORS.green]}
                style={styles.startBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.startBtnText}>BEGIN MATCH</Text>
                <Feather name="arrow-right" size={20} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Match Screen
  const status = getMatchStatus(match);
  const setsWon = getSetsWon(match);

  const getStatusConfig = () => {
    switch (status) {
      case 'deuce':
        return { text: 'DEUCE', color: COLORS.gold, urgent: false };
      case 'advantage_A':
        return { text: `AD ${match.players.A.name}`, color: COLORS.greenAccent, urgent: false };
      case 'advantage_B':
        return { text: `AD ${match.players.B.name}`, color: COLORS.gold, urgent: false };
      case 'set_point_A':
      case 'set_point_B':
        return { text: 'SET POINT', color: COLORS.amber, urgent: true };
      case 'match_point_A':
      case 'match_point_B':
        return { text: 'MATCH POINT', color: COLORS.red, urgent: true };
      case 'match_complete':
        return { text: 'FINAL', color: COLORS.gold, urgent: false };
      default:
        return match.tiebreak ? { text: 'TIEBREAK', color: COLORS.gold, urgent: false } : null;
    }
  };

  const statusConfig = getStatusConfig();

  // Build set scores string for landscape (e.g., "6-4, 7-5")
  const completedSetScores = match.sets.slice(0, -1).map((set, i) => `${set.A}-${set.B}`).join(', ');
  const currentSetGames = `${match.games.A}-${match.games.B}`;

  // LANDSCAPE LAYOUT - TV-style horizontal scoreboard
  if (isLandscape) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.landscapeContent, { 
          paddingTop: insets.top + 8, 
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        }]}>
          {/* Landscape Layout: Left Score Button | Center Scoreboard | Right Score Button */}
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
                {/* Status Banner (if any) */}
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
                  {/* Show set columns - all sets if complete, or completed + current if ongoing */}
                  {match.isComplete ? (
                    // Match complete: show all sets
                    match.sets.map((_, i) => (
                      <Text key={i} style={styles.lsbSetLabel}>{i + 1}</Text>
                    ))
                  ) : (
                    // Match ongoing: show completed sets + current
                    <>
                      {match.sets.slice(0, -1).map((_, i) => (
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
                  {/* Set scores - all sets if complete, or completed + current if ongoing */}
                  {match.isComplete ? (
                    // Match complete: show all set scores
                    match.sets.map((set, i) => (
                      <View key={i} style={styles.lsbSetCol}>
                        <Text style={[styles.lsbSetScore, set.A > set.B && styles.lsbSetScoreWinner]}>
                          {set.A}
                        </Text>
                      </View>
                    ))
                  ) : (
                    // Match ongoing: completed sets + current games
                    <>
                      {match.sets.slice(0, -1).map((set, i) => (
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
                  {/* Points */}
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
                  {/* Set scores - all sets if complete, or completed + current if ongoing */}
                  {match.isComplete ? (
                    // Match complete: show all set scores
                    match.sets.map((set, i) => (
                      <View key={i} style={styles.lsbSetCol}>
                        <Text style={[styles.lsbSetScore, set.B > set.A && styles.lsbSetScoreWinner]}>
                          {set.B}
                        </Text>
                      </View>
                    ))
                  ) : (
                    // Match ongoing: completed sets + current games
                    <>
                      {match.sets.slice(0, -1).map((set, i) => (
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
                  {/* Points */}
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
                    onPress={handleResetMatch}
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
      </View>
    );
  }

  // PORTRAIT LAYOUT (existing)
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Safe Area Content */}
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

            {/* Set History - show all sets when complete, otherwise show completed sets */}
            {((match.isComplete && match.sets.length >= 1) || match.sets.length > 1) && (
              <View style={styles.setHistoryRow}>
                {(match.isComplete ? match.sets : match.sets.slice(0, -1)).map((set, i) => (
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
            onPress={handleResetMatch}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={COLORS.silver} />
            <Text style={styles.controlText}>New Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  safeContent: {
    flex: 1,
  },

  // Court decoration
  courtLines: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.03,
  },
  courtLineH: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: COLORS.white,
  },
  courtLineV: {
    position: 'absolute',
    width: 2,
    height: '60%',
    backgroundColor: COLORS.white,
  },

  // Top bar for setup screen
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarSpacer: {
    width: 48,
  },


  // Setup Screen
  setupContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.green + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.greenAccent + '50',
  },
  logoImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '200',
    color: COLORS.white,
    letterSpacing: 16,
  },
  logoLine: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.gold,
    marginVertical: 12,
  },
  logoSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 8,
  },

  // Inputs
  inputArea: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 48,
  },
  inputRow: {
    marginBottom: 0,
  },
  inputBorder: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradientBorder: {
    padding: 2,
    borderRadius: 16,
  },
  inputInner: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  textInput: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.white,
    padding: 0,
  },

  // VS
  vsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  vsLineLeft: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.muted + '30',
  },
  vsLineRight: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.muted + '30',
  },
  vsBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.muted + '30',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 1,
  },

  // Start button
  startBtn: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 3,
  },

  // Format selector
  formatArea: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 32,
  },
  formatTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  formatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  formatOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.muted + '30',
  },
  formatOptionSelected: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.greenAccent,
  },
  formatOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  formatOptionTextSelected: {
    color: COLORS.white,
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
  // LANDSCAPE STYLES - TV-style scoreboard
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


  // Setup scroll content
  setupScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Step 2: Format selection styles
  formatStepContent: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  playersSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 12,
  },
  playerSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerSummaryName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  playerSummaryVs: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.muted,
  },
  formatStepTitle: {
    fontSize: 28,
    fontWeight: '200',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  formatStepSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  formatList: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginBottom: 32,
    gap: 12,
  },
  formatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  formatListItemSelected: {
    backgroundColor: COLORS.green + '30',
    borderColor: COLORS.greenAccent,
  },
  formatListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  formatRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatRadioSelected: {
    borderColor: COLORS.greenAccent,
  },
  formatRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.greenAccent,
  },
  formatListText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.silver,
  },
  formatListTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
