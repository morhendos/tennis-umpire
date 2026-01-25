import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';

interface CoinFlipProps {
  playerA: string;
  playerB: string;
  onComplete: (server: 'A' | 'B') => void;
}

export const CoinFlip = ({ playerA, playerB, onComplete }: CoinFlipProps) => {
  const [phase, setPhase] = useState<'ready' | 'flipping' | 'result' | 'skip'>('ready');
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
    <View style={styles.container}>
      {/* Title - fades during flip */}
      <Animated.View style={[styles.header, { opacity: contentOpacity }]}>
        <Text style={styles.title}>
          {phase === 'skip' ? 'WHO SERVES FIRST?' : 'COIN TOSS'}
        </Text>
        <Text style={styles.subtitle}>
          {phase === 'ready' && 'Tap the coin to flip'}
          {phase === 'flipping' && 'Flipping...'}
          {phase === 'result' && `${winnerName} wins! Choose:`}
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
      
      {/* Choice buttons - show directly after flip result */}
      {phase === 'result' && (
        <Animated.View style={[styles.choiceArea, { opacity: resultOpacity }]}>
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

      {/* Flip again hint - show below choice buttons */}
      {phase === 'result' && (
        <Animated.View style={[styles.flipAgainHintContainer, { opacity: resultOpacity }]}>
          <Text style={styles.flipAgainHint}>Tap coin to flip again</Text>
        </Animated.View>
      )}

      {/* Players - fades during flip, hide in skip phase */}
      {phase !== 'skip' && (
        <Animated.View style={[styles.players, { opacity: contentOpacity }]}>
          <View style={[styles.player, winner === 'A' && phase !== 'ready' && styles.playerWinner]}>
            <View style={[styles.playerDot, { backgroundColor: COLORS.greenAccent }]} />
            <Text style={styles.playerName}>{playerA}</Text>
          </View>
          <View style={styles.playerDivider} />
          <View style={[styles.player, winner === 'B' && phase !== 'ready' && styles.playerWinner]}>
            <View style={[styles.playerDot, { backgroundColor: COLORS.gold }]} />
            <Text style={styles.playerName}>{playerB}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 4,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  coinTouchArea: {
    marginTop: -80, // Shift coin up to make room for content below
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
  choiceArea: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    justifyContent: 'center',
  },
  flipAgainHintContainer: {
    marginTop: 20,
    alignItems: 'center',
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
  players: {
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
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    opacity: 0.6,
  },
  playerWinner: {
    opacity: 1,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  playerDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.muted + '40',
  },
  skipButton: {
    position: 'absolute',
    bottom: 150,
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
});
