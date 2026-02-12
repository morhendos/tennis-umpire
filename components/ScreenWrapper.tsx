import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, AppColors } from '@/constants/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  showCourtLines?: boolean;
  /** Pass dynamic colors for theme support */
  colors?: AppColors;
}

/**
 * Shared screen wrapper with gradient background and optional court lines
 */
export function ScreenWrapper({ children, showCourtLines = true, colors }: ScreenWrapperProps) {
  const c = colors || COLORS;

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <LinearGradient
        colors={[c.bgPrimary, c.bgSecondary, c.bgPrimary]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      {showCourtLines && (
        <View style={styles.courtLines}>
          <View style={[styles.courtLineH, { backgroundColor: c.white }]} />
          <View style={[styles.courtLineV, { backgroundColor: c.white }]} />
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  },
  courtLineV: {
    position: 'absolute',
    width: 2,
    height: '60%',
  },
});
