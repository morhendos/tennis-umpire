/**
 * ServeIndicator - Pulsing dot to show who is serving
 * 
 * Displays an animated pulsing dot with a glowing effect.
 * Used next to the serving player's name in the scoreboard.
 */

import { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

interface ServeIndicatorProps {
  /** Use compact size for landscape mode */
  compact?: boolean;
  /** Custom color (default: gold) */
  color?: string;
}

export function ServeIndicator({ compact = false, color = COLORS.gold }: ServeIndicatorProps) {
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
  }, [pulseAnim]);

  const containerStyle = compact ? styles.containerCompact : styles.container;
  const pulseStyle = compact ? styles.pulseCompact : styles.pulse;
  const dotStyle = compact ? styles.dotCompact : styles.dot;

  return (
    <View style={containerStyle}>
      <Animated.View
        style={[
          pulseStyle,
          { 
            backgroundColor: color,
            transform: [{ scale: pulseAnim }], 
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.3],
              outputRange: [0.6, 0],
            }) 
          },
        ]}
      />
      <View style={[dotStyle, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Standard size (portrait)
  container: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Compact size (landscape)
  containerCompact: {
    width: 16,
    height: 16,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCompact: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
