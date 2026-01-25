import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Easing,
  Image,
  useWindowDimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMatch } from '@/lib/useMatch';
import { getMatchStatus, getSetsWon, MatchFormatType, FORMAT_NAMES } from '@/lib/scoring';

const { width, height } = Dimensions.get('window');

// Premium Wimbledon-inspired palette
const COLORS = {
  // Deep backgrounds
  bgPrimary: '#050a08',
  bgSecondary: '#0a1210',
  bgCard: '#0d1a15',
  
  // Wimbledon green
  green: '#1a472a',
  greenLight: '#2d6a4f',
  greenAccent: '#40916c',
  
  // Championship gold
  gold: '#c9a227',
  goldLight: '#d4b742',
  goldMuted: '#8b7355',
  
  // Text
  white: '#ffffff',
  cream: '#f5f5dc',
  silver: '#c0c0c0',
  muted: '#5a6b62',
  
  // Scores
  scoreGlow: '#40916c',
  
  // Accents
  red: '#dc2626',
  amber: '#f59e0b',
};

// Animated Score Component
const AnimatedScore = ({ value, color, size = 48 }: { value: string | number, color: string, size?: number }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
      prevValue.current = value;
    }
  }, [value]);

  return (
    <Animated.Text
      style={[
        styles.animatedScore,
        {
          color,
          fontSize: size,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
};

// Pulsing Serve Indicator
const ServeIndicator = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.serveContainer}>
      <Animated.View
        style={[
          styles.servePulse,
          { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
            inputRange: [1, 1.3],
            outputRange: [0.6, 0],
          }) },
        ]}
      />
      <View style={styles.serveDot} />
    </View>
  );
};

// Elegant Icon Button Component
const IconButton = ({ 
  icon, 
  iconFamily = 'ionicons',
  onPress, 
  size = 22,
  disabled = false,
}: { 
  icon: string, 
  iconFamily?: 'ionicons' | 'feather',
  onPress: () => void, 
  size?: number,
  disabled?: boolean,
}) => {
  const IconComponent = iconFamily === 'feather' ? Feather : Ionicons;
  
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <BlurView intensity={30} tint="dark" style={[styles.iconBtn, disabled && styles.iconBtnDisabled]}>
        <IconComponent name={icon as any} size={size} color={disabled ? COLORS.muted : COLORS.silver} />
      </BlurView>
    </TouchableOpacity>
  );
};

// Coin Flip Component
const CoinFlip = ({ 
  playerA, 
  playerB, 
  onComplete 
}: { 
  playerA: string, 
  playerB: string, 
  onComplete: (server: 'A' | 'B') => void 
}) => {
  const [phase, setPhase] = useState<'ready' | 'flipping' | 'result' | 'choose' | 'skip'>('ready');
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const coinRotation = useRef(new Animated.Value(0)).current;
  const coinScale = useRef(new Animated.Value(1)).current;
  const coinShake = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const chooseOpacity = useRef(new Animated.Value(0)).current;

  const flipCoin = () => {
    // Reset for new flip
    setPhase('flipping');
    setWinner(null);
    resultOpacity.setValue(0);
    chooseOpacity.setValue(0);
    
    // Reset rotation to 0 for fresh flip
    coinRotation.setValue(0);
    coinScale.setValue(1);
    coinShake.setValue(0);
    
    // Random winner
    const coinWinner = Math.random() < 0.5 ? 'A' : 'B';
    
    // Total half-rotations (even = A wins, odd = B wins)
    // More flips for dramatic effect
    const totalHalfRotations = coinWinner === 'A' ? 18 : 19;
    const totalDuration = 2400; // Longer flip time
    const upDuration = totalDuration * 0.45; // 45% going up - longer rise
    const downDuration = totalDuration * 0.55; // 55% coming down
    
    Animated.parallel([
      // Fade out content quickly
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      
      // Scale: longer rise up, then fall down, then shake on landing
      Animated.sequence([
        // Toss UP: starts fast, decelerates towards peak
        Animated.timing(coinScale, {
          toValue: 2.4,
          duration: upDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Fall DOWN: starts slow from peak, accelerates down
        Animated.timing(coinScale, {
          toValue: 1,
          duration: downDuration,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Landing shake - subtle
        Animated.sequence([
          Animated.timing(coinShake, {
            toValue: 4,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(coinShake, {
            toValue: -3,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(coinShake, {
            toValue: 2,
            duration: 35,
            useNativeDriver: true,
          }),
          Animated.timing(coinShake, {
            toValue: -1,
            duration: 30,
            useNativeDriver: true,
          }),
          Animated.timing(coinShake, {
            toValue: 0,
            duration: 25,
            useNativeDriver: true,
          }),
        ]),
      ]),
      
      // Rotation: slow start, fast middle, slow end (like real physics)
      Animated.timing(coinRotation, {
        toValue: totalHalfRotations,
        duration: totalDuration,
        easing: Easing.bezier(0.4, 0.0, 0.6, 1.0), // slow-fast-slow
        useNativeDriver: true,
      }),
    ]).start(() => {
      setWinner(coinWinner);
      setPhase('result');
      
      // Fade content back in with result
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleChoice = (choice: 'serve' | 'receive') => {
    if (!winner) return;
    const server = choice === 'serve' ? winner : (winner === 'A' ? 'B' : 'A');
    onComplete(server);
  };

  const proceedToChoice = () => {
    setPhase('choose');
    Animated.timing(chooseOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleSkip = () => {
    setPhase('skip');
  };

  const handleDirectSelect = (server: 'A' | 'B') => {
    onComplete(server);
  };

  // Create interpolation for scaleX to simulate 3D flip
  // Each unit = 180° rotation, need explicit values for proper cycling
  const scaleX = coinRotation.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26],
    outputRange: [1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1, 0.05, 1],
  });

  // Side A visible when rotation is even (0, 2, 4...), hidden when odd (1, 3, 5...)
  const sideAOpacity = coinRotation.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26],
    outputRange: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
  });

  // Side B is opposite of A
  const sideBOpacity = coinRotation.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5, 26],
    outputRange: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
  });

  const winnerName = winner === 'A' ? playerA : playerB;
  const playerAInitial = playerA.charAt(0).toUpperCase();
  const playerBInitial = playerB.charAt(0).toUpperCase();

  return (
    <View style={styles.coinFlipContainer}>
      {/* Title - fades during flip */}
      <Animated.View style={[styles.coinFlipHeader, { opacity: contentOpacity }]}>
        <Text style={styles.coinFlipTitle}>
          {phase === 'skip' ? 'WHO SERVES FIRST?' : 'COIN TOSS'}
        </Text>
        <Text style={styles.coinFlipSubtitle}>
          {phase === 'ready' && 'Tap the coin to flip'}
          {phase === 'flipping' && 'Flipping...'}
          {phase === 'result' && `${winnerName} wins the toss!`}
          {phase === 'choose' && `${winnerName}, choose:`}
          {phase === 'skip' && 'Select the player who will serve'}
        </Text>
      </Animated.View>

      {/* Coin - hide in skip phase */}
      {phase !== 'skip' && (
        <TouchableOpacity 
          onPress={phase === 'ready' || phase === 'result' ? flipCoin : undefined}
          activeOpacity={phase === 'ready' || phase === 'result' ? 0.8 : 1}
          style={styles.coinTouchArea}
        >
          <Animated.View
            style={[
              styles.coin,
              {
                transform: [
                  { translateX: coinShake },
                  { scale: coinScale },
                  { scaleX: scaleX },
                ],
              },
            ]}
          >
            {/* Side A - Green (Player 1) */}
            <Animated.View style={[styles.coinSide, { opacity: sideAOpacity }]}>
              <LinearGradient
                colors={[COLORS.greenAccent, COLORS.greenLight, COLORS.green]}
                style={styles.coinGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.coinInner, { backgroundColor: COLORS.greenLight }]}>
                  <Text style={[styles.coinInitial, { color: COLORS.white }]}>{playerAInitial}</Text>
                </View>
                <View style={[styles.coinRing, { borderColor: COLORS.greenAccent + '60' }]} />
              </LinearGradient>
            </Animated.View>
            
            {/* Side B - Gold (Player 2) */}
            <Animated.View style={[styles.coinSide, { opacity: sideBOpacity }]}>
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.gold, COLORS.goldMuted]}
                style={styles.coinGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.coinInner, { backgroundColor: COLORS.goldLight }]}>
                  <Text style={[styles.coinInitial, { color: COLORS.bgPrimary }]}>{playerBInitial}</Text>
                </View>
                <View style={[styles.coinRing, { borderColor: COLORS.goldLight + '60' }]} />
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Skip phase - direct player selection */}
      {phase === 'skip' && (
        <View style={styles.skipSelectionArea}>
          <TouchableOpacity
            style={styles.skipPlayerBtn}
            onPress={() => handleDirectSelect('A')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.greenLight, COLORS.green]}
              style={styles.skipPlayerBtnGradient}
            >
              <Ionicons name="tennisball" size={28} color={COLORS.white} />
              <Text style={styles.skipPlayerBtnName}>{playerA}</Text>
              <Text style={styles.skipPlayerBtnLabel}>SERVES FIRST</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipPlayerBtn}
            onPress={() => handleDirectSelect('B')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.goldLight, COLORS.gold]}
              style={styles.skipPlayerBtnGradient}
            >
              <Ionicons name="tennisball" size={28} color={COLORS.bgPrimary} />
              <Text style={[styles.skipPlayerBtnName, { color: COLORS.bgPrimary }]}>{playerB}</Text>
              <Text style={[styles.skipPlayerBtnLabel, { color: COLORS.bgPrimary + 'aa' }]}>SERVES FIRST</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Flip again hint */}
      {phase === 'result' && (
        <Animated.View style={[styles.resultActions, { opacity: resultOpacity }]}>
          <Text style={styles.flipAgainHint}>Tap coin to flip again</Text>
          <TouchableOpacity style={styles.confirmTossBtn} onPress={proceedToChoice}>
            <Text style={styles.confirmTossBtnText}>CONFIRM</Text>
            <Ionicons name="checkmark" size={18} color={COLORS.greenAccent} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Result indicator - only show in choose phase */}
      {phase === 'choose' && (
        <Animated.View style={[styles.resultBadge, { opacity: resultOpacity }]}>
          <View style={[
            styles.resultDot, 
            { backgroundColor: winner === 'A' ? COLORS.greenAccent : COLORS.gold }
          ]} />
          <Text style={styles.resultText}>{winnerName}</Text>
          <Text style={styles.resultWins}>WINS THE TOSS</Text>
        </Animated.View>
      )}

      {/* Choice buttons */}
      {phase === 'choose' && (
        <Animated.View style={[styles.choiceArea, { opacity: chooseOpacity }]}>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => handleChoice('serve')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={winner === 'A' 
                ? [COLORS.greenLight, COLORS.green]
                : [COLORS.goldLight, COLORS.gold]
              }
              style={styles.choiceBtnGradient}
            >
              <Ionicons name="tennisball" size={24} color={winner === 'A' ? COLORS.white : COLORS.bgPrimary} />
              <Text style={[styles.choiceBtnText, { color: winner === 'A' ? COLORS.white : COLORS.bgPrimary }]}>SERVE</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => handleChoice('receive')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={winner === 'A' 
                ? [COLORS.greenLight, COLORS.green]
                : [COLORS.goldLight, COLORS.gold]
              }
              style={styles.choiceBtnGradient}
            >
              <Ionicons name="hand-left" size={24} color={winner === 'A' ? COLORS.white : COLORS.bgPrimary} />
              <Text style={[styles.choiceBtnText, { color: winner === 'A' ? COLORS.white : COLORS.bgPrimary }]}>RECEIVE</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Players - fades during flip, hide in skip phase */}
      {phase !== 'skip' && (
        <Animated.View style={[styles.coinPlayers, { opacity: contentOpacity }]}>
          <View style={[styles.coinPlayer, winner === 'A' && phase !== 'ready' && styles.coinPlayerWinner]}>
            <View style={[styles.coinPlayerDot, { backgroundColor: COLORS.greenAccent }]} />
            <Text style={styles.coinPlayerName}>{playerA}</Text>
          </View>
          <View style={styles.coinPlayerDivider} />
          <View style={[styles.coinPlayer, winner === 'B' && phase !== 'ready' && styles.coinPlayerWinner]}>
            <View style={[styles.coinPlayerDot, { backgroundColor: COLORS.gold }]} />
            <Text style={styles.coinPlayerName}>{playerB}</Text>
          </View>
        </Animated.View>
      )}

      {/* Skip button - only show in ready phase */}
      {phase === 'ready' && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.8}>
          <View style={styles.skipButtonInner}>
            <Feather name="skip-forward" size={20} color={COLORS.silver} />
            <Text style={styles.skipButtonText}>SKIP COIN TOSS</Text>
          </View>
          <Text style={styles.skipButtonHint}>Already decided who serves?</Text>
        </TouchableOpacity>
      )}

      {/* Back to coin toss button - only show in skip phase */}
      {phase === 'skip' && (
        <TouchableOpacity style={styles.backButton} onPress={() => setPhase('ready')} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color={COLORS.silver} />
          <Text style={styles.backButtonText}>BACK TO COIN TOSS</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Compact Serve Indicator for landscape
const ServeIndicatorCompact = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.serveCompact}>
      <Animated.View
        style={[
          styles.servePulseCompact,
          { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
            inputRange: [1, 1.3],
            outputRange: [0.6, 0],
          }) },
        ]}
      />
      <View style={styles.serveDotCompact} />
    </View>
  );
};

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
                      {match.server === 'A' && <ServeIndicatorCompact />}
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
                      {match.server === 'B' && <ServeIndicatorCompact />}
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

  // Icon button
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.muted + '30',
  },
  iconBtnDisabled: {
    opacity: 0.4,
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

  // Coin Flip
  coinFlipContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  coinFlipHeader: {
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
  },
  coinFlipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 4,
    marginBottom: 12,
  },
  coinFlipSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  coinTouchArea: {
    marginTop: -140, // Shift coin up to make room for content below
  },
  coin: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  coinSide: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
  },
  coinGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinInitial: {
    fontSize: 42,
    fontWeight: '800',
  },
  coinRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
  },
  flipAgainHint: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  resultActions: {
    alignItems: 'center',
    gap: 16,
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
  },
  confirmTossBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.greenAccent + '40',
  },
  confirmTossBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.greenAccent,
    letterSpacing: 2,
  },
  resultBadge: {
    alignItems: 'center',
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
  },
  resultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  resultWins: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 2,
  },
  choiceArea: {
    flexDirection: 'row',
    gap: 16,
    position: 'absolute',
    top: '66%',
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  choiceBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 140,
  },
  choiceBtnGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  choiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 2,
  },
  coinPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    gap: 20,
    position: 'absolute',
    bottom: 60,
    left: 32,
    right: 32,
    justifyContent: 'center',
  },
  coinPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.6,
  },
  coinPlayerWinner: {
    opacity: 1,
  },
  coinPlayerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  coinPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  coinPlayerDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.muted + '40',
  },

  // Skip button - prominent and easy to tap
  skipButton: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.muted + '40',
    alignItems: 'center',
  },
  skipButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.silver,
    letterSpacing: 2,
  },
  skipButtonHint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  backButton: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.muted + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.silver,
    letterSpacing: 1,
  },

  // Skip selection area
  skipSelectionArea: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 40,
  },
  skipPlayerBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: 160,
  },
  skipPlayerBtnGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  skipPlayerBtnName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  skipPlayerBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white + '80',
    letterSpacing: 2,
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

  // Animated score
  animatedScore: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Serve indicator
  serveContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servePulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
  },
  serveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
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

  // Compact serve indicator for landscape
  serveCompact: {
    width: 16,
    height: 16,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servePulseCompact: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.gold,
  },
  serveDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
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
