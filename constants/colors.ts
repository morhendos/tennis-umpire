/**
 * Tennis Umpire - Color Palette
 * 
 * Premium Wimbledon-inspired theme with green and gold accents.
 * Supports dark and light modes for different playing conditions.
 */

import { useThemeStore, ThemeMode } from '@/lib/themeStore';

// ─── Dark Theme (Original Wimbledon night mode) ──────────────
export const DARK_COLORS = {
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
  blue: '#3b82f6',
} as const;

// ─── Light Theme (Outdoor court mode) ────────────────────────
export const LIGHT_COLORS = {
  // Light backgrounds
  bgPrimary: '#f0f4f2',
  bgSecondary: '#e4ebe7',
  bgCard: '#ffffff',
  
  // Wimbledon green (darker for contrast on light bg)
  green: '#1a5c35',
  greenLight: '#2d7a50',
  greenAccent: '#1a6b3c',
  
  // Championship gold (richer for light bg)
  gold: '#a88520',
  goldLight: '#c9a227',
  goldMuted: '#7a6940',
  
  // Text (inverted)
  white: '#0d1a15',      // Primary text = dark
  cream: '#1a2a22',
  silver: '#3a4a42',     // Secondary text
  muted: '#8a9a92',      // Tertiary text
  
  // Scores
  scoreGlow: '#1a6b3c',
  
  // Accents
  red: '#dc2626',
  amber: '#d97706',
  blue: '#2563eb',
} as const;

// ─── Color types ─────────────────────────────────────────────
export type AppColors = typeof DARK_COLORS;
export type ColorKey = keyof AppColors;
export type ColorValue = AppColors[ColorKey];

// ─── Default export (dark) for backward compat / static styles ───
export const COLORS = DARK_COLORS;

// ─── Hook: get active color palette ──────────────────────────
export function useColors(): AppColors {
  const theme = useThemeStore((s) => s.theme);
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

// ─── Helper: get colors for a given theme ────────────────────
export function getColors(theme: ThemeMode): AppColors {
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}
