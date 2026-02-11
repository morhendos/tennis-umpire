import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { flicService, FlicButton, FlicEvent, ButtonAssignments } from '@/lib/flic';

interface FlicStatusStripProps {
  /** Current assignments from useFlic hook */
  assignments: ButtonAssignments;
  /** All known buttons */
  buttons: FlicButton[];
  /** Whether the flic service is initialized */
  isInitialized: boolean;
  /** Swap the A/B assignments */
  onSwap: () => void;
  /** Player names for display */
  playerAName?: string;
  playerBName?: string;
}

export function FlicStatusStrip({
  assignments,
  buttons,
  isInitialized,
  onSwap,
  playerAName,
  playerBName,
}: FlicStatusStripProps) {
  const router = useRouter();
  const [lastPressed, setLastPressed] = useState<'A' | 'B' | null>(null);
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerA = assignments.playerA 
    ? buttons.find(b => b.uuid === assignments.playerA) 
    : undefined;
  const playerB = assignments.playerB 
    ? buttons.find(b => b.uuid === assignments.playerB) 
    : undefined;

  const hasBothAssigned = !!assignments.playerA && !!assignments.playerB;
  const hasAnyButtons = buttons.length > 0;

  // Animate pulse on the correct side
  const triggerPulse = useCallback((player: 'A' | 'B') => {
    const anim = player === 'A' ? pulseA : pulseB;
    setLastPressed(player);

    // Clear previous timeout
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);

    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start();

    // Clear the "last pressed" indicator after a few seconds
    clearTimeoutRef.current = setTimeout(() => setLastPressed(null), 3000);
  }, [pulseA, pulseB]);

  // Listen for button presses to identify buttons
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = flicService.addEventListener((event: FlicEvent) => {
      const player = flicService.getPlayerForButton(event.buttonId);
      if (player && event.eventType === 'click') {
        triggerPulse(player);
      }
    });

    return () => {
      unsubscribe();
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, [isInitialized, triggerPulse]);

  // Not initialized yet — show nothing
  if (!isInitialized) return null;

  // No buttons paired at all — show setup prompt
  if (!hasAnyButtons) {
    return (
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => router.push('/flic-setup')}
        activeOpacity={0.7}
      >
        <View style={styles.setupPrompt}>
          <Ionicons name="bluetooth-outline" size={18} color={COLORS.muted} />
          <Text style={styles.setupPromptText}>Set up Flic buttons</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
    );
  }

  // Has buttons — show status with test capability
  const pulseABg = pulseA.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.bgCard, COLORS.greenAccent + '60'],
  });
  const pulseBBg = pulseB.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.bgCard, COLORS.gold + '60'],
  });

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bluetooth" size={14} color={COLORS.greenAccent} />
          <Text style={styles.headerLabel}>FLIC BUTTONS</Text>
        </View>
        <View style={styles.headerRight}>
          {hasBothAssigned && (
            <TouchableOpacity style={styles.swapBtn} onPress={onSwap} activeOpacity={0.7}>
              <Ionicons name="swap-horizontal" size={16} color={COLORS.gold} />
              <Text style={styles.swapText}>Swap</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.setupLink} 
            onPress={() => router.push('/flic-setup')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={14} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Button status cards */}
      <View style={styles.buttonsRow}>
        <Animated.View style={[styles.buttonSlot, { backgroundColor: pulseABg }]}>
          <View style={styles.slotHeader}>
            <View style={[styles.playerDot, { backgroundColor: COLORS.greenAccent }]} />
            <Text style={styles.slotPlayer}>
              {playerAName?.trim() || 'Player A'}
            </Text>
          </View>
          {playerA ? (
            <View style={styles.slotStatus}>
              <View style={[
                styles.connectionDot, 
                playerA.isConnected && styles.connectionDotActive
              ]} />
              <Text style={styles.slotButtonName} numberOfLines={1}>
                {playerA.name}
              </Text>
              {lastPressed === 'A' && (
                <Text style={styles.pressedBadge}>✓</Text>
              )}
            </View>
          ) : (
            <Text style={styles.slotEmpty}>Not assigned</Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.buttonSlot, { backgroundColor: pulseBBg }]}>
          <View style={styles.slotHeader}>
            <View style={[styles.playerDot, { backgroundColor: COLORS.gold }]} />
            <Text style={styles.slotPlayer}>
              {playerBName?.trim() || 'Player B'}
            </Text>
          </View>
          {playerB ? (
            <View style={styles.slotStatus}>
              <View style={[
                styles.connectionDot, 
                playerB.isConnected && styles.connectionDotActive
              ]} />
              <Text style={styles.slotButtonName} numberOfLines={1}>
                {playerB.name}
              </Text>
              {lastPressed === 'B' && (
                <Text style={styles.pressedBadge}>✓</Text>
              )}
            </View>
          ) : (
            <Text style={styles.slotEmpty}>Not assigned</Text>
          )}
        </Animated.View>
      </View>

      {/* Hint text */}
      {hasBothAssigned && (
        <Text style={styles.hintText}>
          Press a Flic button to test which is which
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },

  // Setup prompt (no buttons paired)
  setupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  setupPromptText: {
    fontSize: 14,
    color: COLORS.muted,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: COLORS.gold + '15',
    borderRadius: 12,
  },
  swapText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gold,
  },
  setupLink: {
    padding: 4,
  },

  // Button slots
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonSlot: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.muted + '20',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slotPlayer: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.silver,
    letterSpacing: 1,
  },
  slotStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.muted,
  },
  connectionDotActive: {
    backgroundColor: COLORS.greenAccent,
  },
  slotButtonName: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
  },
  slotEmpty: {
    fontSize: 12,
    color: COLORS.muted + '80',
    fontStyle: 'italic',
  },
  pressedBadge: {
    fontSize: 14,
    color: COLORS.greenAccent,
    fontWeight: '700',
  },

  // Hint
  hintText: {
    fontSize: 11,
    color: COLORS.muted + '80',
    textAlign: 'center',
    marginTop: 8,
  },
});
