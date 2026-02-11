import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import { COLORS } from '@/constants/colors';
import { IconButton } from '@/components/ui';
import { ScreenWrapper } from '@/components/ScreenWrapper';
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
      <ScreenWrapper>
        <KeyboardAvoidingView 
          style={styles.safeContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.topBarSpacer} />
            <IconButton 
              icon="volume-high-outline" 
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
                          onChangeText={onPlayerANameChange}
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
                          onChangeText={onPlayerBNameChange}
                          autoCapitalize="words"
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
      </ScreenWrapper>
    );
  }

  // Step 2: Format Selection
  return (
    <ScreenWrapper>
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
            {FORMAT_OPTIONS.map((format) => (
              <TouchableOpacity
                key={format}
                style={[
                  styles.formatListItem,
                  selectedFormat === format && styles.formatListItemSelected,
                ]}
                onPress={() => onFormatChange(format)}
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
            onPress={onBeginMatch}
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
    color: COLORS.white,
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
