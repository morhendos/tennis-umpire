import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MatchFormatType, FORMAT_NAMES } from '@/lib/scoring';
import { useColors } from '@/constants/colors';
import { IconButton } from '@/components/ui';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PlayerNameInput } from '@/components/PlayerNameInput';
import { FORMAT_OPTIONS } from '@/lib/matchUtils';
import { FlicStatusStrip } from '@/components/FlicStatusStrip';
import { FlicButton, ButtonAssignments } from '@/lib/flic';

interface FlicState {
  isInitialized: boolean;
  buttons: FlicButton[];
  assignments: ButtonAssignments;
  swapAssignments: () => void;
}

interface SetupScreenProps {
  step: 'players' | 'format';
  playerAName: string;
  playerBName: string;
  selectedFormat: MatchFormatType;
  onPlayerANameChange: (name: string) => void;
  onPlayerBNameChange: (name: string) => void;
  onFormatChange: (format: MatchFormatType) => void;
  onNextStep: () => void;
  onBackStep: () => void;
  onBeginMatch: () => void;
  flicState?: FlicState;
}

export function SetupScreen({
  step,
  playerAName,
  playerBName,
  selectedFormat,
  onPlayerANameChange,
  onPlayerBNameChange,
  onFormatChange,
  onNextStep,
  onBackStep,
  onBeginMatch,
  flicState,
}: SetupScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const canProceed = playerAName.trim().length > 0 && playerBName.trim().length > 0;

  // Step 1: Player Names
  if (step === 'players') {
    return (
      <ScreenWrapper colors={c}>
        <KeyboardAvoidingView 
          style={styles.safeContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.topBarSpacer} />
            <IconButton 
              icon="volume-high-outline" 
              onPress={() => router.push('/settings')}
              colors={c}
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
                <View style={[styles.logoCircle, { backgroundColor: c.green + '30', borderColor: c.greenAccent + '50' }]}>
                  <Image 
                    source={require('@/assets/images/ball03.png')} 
                    style={styles.logoImage}
                  />
                </View>
                <Text style={[styles.logoText, { color: c.white }]}>TENNIS</Text>
                <View style={[styles.logoLine, { backgroundColor: c.gold }]} />
                <Text style={[styles.logoSubtext, { color: c.gold }]}>UMPIRE</Text>
              </View>

              {/* Input Fields */}
              <View style={styles.inputArea}>
                <View style={[styles.inputRow, { zIndex: 20 }]}>
                  <View style={styles.inputBorder}>
                    <LinearGradient
                      colors={[c.greenAccent, c.green]}
                      style={styles.inputGradientBorder}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={[styles.inputInner, { backgroundColor: c.bgCard }]}>
                        <PlayerNameInput
                          value={playerAName}
                          onChangeText={onPlayerANameChange}
                          label="PLAYER 1"
                          colors={c}
                          excludeName={playerBName}
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.vsSection}>
                  <View style={[styles.vsLineLeft, { backgroundColor: c.muted + '30' }]} />
                  <View style={[styles.vsBadge, { backgroundColor: c.bgCard, borderColor: c.muted + '30' }]}>
                    <Text style={[styles.vsText, { color: c.muted }]}>VS</Text>
                  </View>
                  <View style={[styles.vsLineRight, { backgroundColor: c.muted + '30' }]} />
                </View>

                <View style={[styles.inputRow, { zIndex: 10 }]}>
                  <View style={styles.inputBorder}>
                    <LinearGradient
                      colors={[c.gold, c.goldMuted]}
                      style={styles.inputGradientBorder}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={[styles.inputInner, { backgroundColor: c.bgCard }]}>
                        <PlayerNameInput
                          value={playerBName}
                          onChangeText={onPlayerBNameChange}
                          label="PLAYER 2"
                          colors={c}
                          excludeName={playerAName}
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              </View>

              {/* Flic Button Status */}
              {flicState && (
                <View style={styles.flicStripContainer}>
                  <FlicStatusStrip
                    isInitialized={flicState.isInitialized}
                    buttons={flicState.buttons}
                    assignments={flicState.assignments}
                    onSwap={flicState.swapAssignments}
                    playerAName={playerAName}
                    playerBName={playerBName}
                  />
                </View>
              )}

              {/* Next Button */}
              <TouchableOpacity
                style={[styles.startBtn, !canProceed && styles.startBtnDisabled]}
                onPress={onNextStep}
                disabled={!canProceed}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={canProceed ? [c.greenLight, c.green] : [c.muted, c.muted]}
                  style={styles.startBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.startBtnText}>NEXT</Text>
                  <Feather name="arrow-right" size={20} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            
            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenWrapper>
    );
  }

  // Step 2: Format Selection
  return (
    <ScreenWrapper colors={c}>
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
            onPress={onBackStep}
            colors={c}
          />
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.formatStepContent}>
          {/* Players Summary */}
          <View style={styles.playersSummary}>
            <View style={styles.playerSummaryItem}>
              <View style={[styles.playerDot, { backgroundColor: c.greenAccent }]} />
              <Text style={[styles.playerSummaryName, { color: c.white }]}>{playerAName.trim()}</Text>
            </View>
            <Text style={[styles.playerSummaryVs, { color: c.muted }]}>vs</Text>
            <View style={styles.playerSummaryItem}>
              <View style={[styles.playerDot, { backgroundColor: c.gold }]} />
              <Text style={[styles.playerSummaryName, { color: c.white }]}>{playerBName.trim()}</Text>
            </View>
          </View>

          {/* Format Title */}
          <Text style={[styles.formatStepTitle, { color: c.white }]}>SELECT FORMAT</Text>
          <Text style={[styles.formatStepSubtitle, { color: c.muted }]}>How long should the match be?</Text>

          {/* Format Options - Vertical List */}
          <View style={styles.formatList}>
            {FORMAT_OPTIONS.map((format) => (
              <TouchableOpacity
                key={format}
                style={[
                  styles.formatListItem,
                  { backgroundColor: c.bgCard, borderColor: c.muted + '20' },
                  selectedFormat === format && { backgroundColor: c.green + '30', borderColor: c.greenAccent },
                ]}
                onPress={() => onFormatChange(format)}
                activeOpacity={0.7}
              >
                <View style={styles.formatListContent}>
                  <View style={[
                    styles.formatRadio,
                    { borderColor: c.muted },
                    selectedFormat === format && { borderColor: c.greenAccent },
                  ]}>
                    {selectedFormat === format && <View style={[styles.formatRadioDot, { backgroundColor: c.greenAccent }]} />}
                  </View>
                  <Text
                    style={[
                      styles.formatListText,
                      { color: c.silver },
                      selectedFormat === format && { color: c.white, fontWeight: '600' },
                    ]}
                  >
                    {FORMAT_NAMES[format]}
                  </Text>
                </View>
                {selectedFormat === format && (
                  <Ionicons name="checkmark" size={20} color={c.greenAccent} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={onBeginMatch}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[c.greenLight, c.green]}
              style={styles.startBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.startBtnText}>BEGIN MATCH</Text>
              <Feather name="arrow-right" size={20} color="#ffffff" />
            </LinearGradient>
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

  // Top bar
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

  // Setup scroll content
  setupScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
  },
  logoImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: 16,
  },
  logoLine: {
    width: 60,
    height: 2,
    marginVertical: 12,
  },
  logoSubtext: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  inputGradientBorder: {
    padding: 2,
    borderRadius: 16,
  },
  inputInner: {
    borderRadius: 14,
    padding: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  textInput: {
    fontSize: 20,
    fontWeight: '500',
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
  },
  vsLineRight: {
    flex: 1,
    height: 1,
  },
  vsBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Flic strip
  flicStripContainer: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 32,
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
    color: '#ffffff',
    letterSpacing: 3,
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
  },
  playerSummaryVs: {
    fontSize: 14,
    fontWeight: '400',
  },
  formatStepTitle: {
    fontSize: 28,
    fontWeight: '200',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  formatStepSubtitle: {
    fontSize: 14,
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
    borderRadius: 14,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  formatListText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
