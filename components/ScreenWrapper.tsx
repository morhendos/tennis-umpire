import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  showCourtLines?: boolean;
}

/**
 * Shared screen wrapper with gradient background and optional court lines
 */
export function ScreenWrapper({ children, showCourtLines = true }: ScreenWrapperProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.bgPrimary, COLORS.bgSecondary, COLORS.bgPrimary]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      {showCourtLines && (
        <View style={styles.courtLines}>
          <View style={styles.courtLineH} />
          <View style={styles.courtLineV} />
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
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
    backgroundColor: COLORS.white,
  },
  courtLineV: {
    position: 'absolute',
    width: 2,
    height: '60%',
    backgroundColor: COLORS.white,
  },
});
