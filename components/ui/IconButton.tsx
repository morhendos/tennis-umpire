/**
 * IconButton - Blur background icon button
 * 
 * A circular button with a blurred glass-like background.
 * Supports both Ionicons and Feather icon families.
 */

import { TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';

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
}

export function IconButton({ 
  icon, 
  iconFamily = 'ionicons',
  onPress, 
  size = 22,
  disabled = false,
}: IconButtonProps) {
  const IconComponent = iconFamily === 'feather' ? Feather : Ionicons;
  
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <BlurView intensity={30} tint="dark" style={[styles.iconBtn, disabled && styles.iconBtnDisabled]}>
        <IconComponent 
          name={icon as any} 
          size={size} 
          color={disabled ? COLORS.muted : COLORS.silver} 
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
    borderColor: COLORS.muted + '30',
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
});
