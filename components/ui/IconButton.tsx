/**
 * IconButton - Blur background icon button
 * 
 * A circular button with a blurred glass-like background.
 * Supports both Ionicons and Feather icon families.
 */

import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, AppColors } from '@/constants/colors';
import { useThemeStore } from '@/lib/themeStore';

interface IconButtonProps {
  /** Icon name from the selected icon family */
  icon: string;
  /** Icon library to use */
  iconFamily?: 'ionicons' | 'feather';
  /** Press handler */
  onPress: () => void;
  /** Icon size (default: 22) */
  size?: number;
  /** Disable the button */
  disabled?: boolean;
  /** Override colors for theme support */
  colors?: AppColors;
}

export function IconButton({ 
  icon, 
  iconFamily = 'ionicons',
  onPress, 
  size = 22,
  disabled = false,
  colors,
}: IconButtonProps) {
  const theme = useThemeStore((s) => s.theme);
  const c = colors || COLORS;
  const IconComponent = iconFamily === 'feather' ? Feather : Ionicons;
  
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <BlurView 
        intensity={30} 
        tint={theme === 'light' ? 'light' : 'dark'} 
        style={[styles.iconBtn, { borderColor: c.muted + '30' }, disabled && styles.iconBtnDisabled]}
      >
        <IconComponent 
          name={icon as any} 
          size={size} 
          color={disabled ? c.muted : c.silver} 
        />
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
});
