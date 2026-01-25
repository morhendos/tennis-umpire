/**
 * AnimatedScore - Animated number display with scale effect
 * 
 * Displays a score value with a subtle bounce animation when the value changes.
 * Used in scoreboards to make score changes more noticeable.
 */

import { useRef, useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface AnimatedScoreProps {
  /** The score value to display */
  value: string | number;
  /** Text color */
  color: string;
  /** Font size (default: 48) */
  size?: number;
}

export function AnimatedScore({ value, color, size = 48 }: AnimatedScoreProps) {
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
  }, [value, scaleAnim]);

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
}

const styles = StyleSheet.create({
  animatedScore: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
