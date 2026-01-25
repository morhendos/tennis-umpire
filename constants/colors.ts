/**
 * Tennis Umpire - Color Palette
 * 
 * Premium Wimbledon-inspired dark theme with green and gold accents.
 * Used throughout the app for consistent branding.
 */

export const COLORS = {
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

// Type for the colors object
export type ColorKey = keyof typeof COLORS;
export type ColorValue = typeof COLORS[ColorKey];
