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
import { useColors } from '@/constants/colors';
import { flicService, FlicButton, FlicEvent, ButtonAssignments } from '@/lib/flic';

interface FlicStatusStripProps {
  assignments: ButtonAssignments;
  buttons: FlicButton[];
  isInitialized: boolean;
  onSwap: () => void;
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
  const c = useColors();
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

  const triggerPulse = useCallback((player: 'A' | 'B') => {
    const anim = player === 'A' ? pulseA : pulseB;
    setLastPressed(player);
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);

    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start();

    clearTimeoutRef.current = setTimeout(() => setLastPressed(null), 3000);
  }, [pulseA, pulseB]);

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

  if (!isInitialized) return null;

  if (!hasAnyButtons) {
    return (
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => router.push('/flic-setup')}
        activeOpacity={0.7}
      >
        <View style={[styles.setupPrompt, { backgroundColor: c.bgCard, borderColor: c.muted + '20' }]}>
          <Ionicons name="bluetooth-outline" size={18} color={c.muted} />
          <Text style={[styles.setupPromptText, { color: c.muted }]}>Set up Flic buttons</Text>
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </View>
      </TouchableOpacity>
    );
  }

  const pulseABg = pulseA.interpolate({
    inputRange: [0, 1],
    outputRange: [c.bgCard, c.greenAccent + '60'],
  });
  const pulseBBg = pulseB.interpolate({
    inputRange: [0, 1],
    outputRange: [c.bgCard, c.gold + '60'],
  });

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bluetooth" size={14} color={c.greenAccent} />
          <Text style={[styles.headerLabel, { color: c.muted }]}>FLIC BUTTONS</Text>
        </View>
        <View style={styles.headerRight}>
          {hasBothAssigned && (
            <TouchableOpacity style={[styles.swapBtn, { backgroundColor: c.gold + '15' }]} onPress={onSwap} activeOpacity={0.7}>
              <Ionicons name="swap-horizontal" size={16} color={c.gold} />
              <Text style={[styles.swapText, { color: c.gold }]}>Swap</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.setupLink} 
            onPress={() => router.push('/flic-setup')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={14} color={c.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Button status cards */}
      <View style={styles.buttonsRow}>
        <Animated.View style={[styles.buttonSlot, { backgroundColor: pulseABg, borderColor: c.muted + '20' }]}>
          <View style={styles.slotHeader}>
            <View style={[styles.playerDot, { backgroundColor: c.greenAccent }]} />
            <Text style={[styles.slotPlayer, { color: c.silver }]}>
              {playerAName?.trim() || 'Player A'}
            </Text>
          </View>
          {playerA ? (
            <View style={styles.slotStatus}>
              <View style={[
                styles.connectionDot, 
                { backgroundColor: c.muted },
                playerA.isConnected && { backgroundColor: c.greenAccent },
              ]} />
              <Text style={[styles.slotButtonName, { color: c.muted }]} numberOfLines={1}>
                {playerA.name}
              </Text>
              {lastPressed === 'A' && (
                <Text style={[styles.pressedBadge, { color: c.greenAccent }]}>✓</Text>
              )}
            </View>
          ) : (
            <Text style={[styles.slotEmpty, { color: c.muted + '80' }]}>Not assigned</Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.buttonSlot, { backgroundColor: pulseBBg, borderColor: c.muted + '20' }]}>
          <View style={styles.slotHeader}>
            <View style={[styles.playerDot, { backgroundColor: c.gold }]} />
            <Text style={[styles.slotPlayer, { color: c.silver }]}>
              {playerBName?.trim() || 'Player B'}
            </Text>
          </View>
          {playerB ? (
            <View style={styles.slotStatus}>
              <View style={[
                styles.connectionDot, 
                { backgroundColor: c.muted },
                playerB.isConnected && { backgroundColor: c.greenAccent },
              ]} />
              <Text style={[styles.slotButtonName, { color: c.muted }]} numberOfLines={1}>
                {playerB.name}
              </Text>
              {lastPressed === 'B' && (
                <Text style={[styles.pressedBadge, { color: c.greenAccent }]}>✓</Text>
              )}
            </View>
          ) : (
            <Text style={[styles.slotEmpty, { color: c.muted + '80' }]}>Not assigned</Text>
          )}
        </Animated.View>
      </View>

      {hasBothAssigned && (
        <Text style={[styles.hintText, { color: c.muted + '80' }]}>
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
  setupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  setupPromptText: {
    fontSize: 14,
  },
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
    borderRadius: 12,
  },
  swapText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setupLink: {
    padding: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonSlot: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
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
  },
  slotButtonName: {
    fontSize: 12,
    flex: 1,
  },
  slotEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  pressedBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
