export const LIGHT_COLORS = {
  primary: "#4ADE80",
  secondary: "#2DD4BF",
  background: "#FFFFFF",
  surface: "#F2F2F7",
  surfaceLight: "#E5E5EA",
  card: "#FFFFFF",
  text: "#000000",
  textSecondary: "#6B7280",
  border: "#E5E5EA",
  white: "#000000", // Text color in light mode
  grey: "#6B7280",
} as const;

export const DARK_COLORS = {
  primary: "#4ADE80",
  secondary: "#2DD4BF",
  background: "#000000",
  surface: "#1A1A1A",
  surfaceLight: "#2A2A2A",
  card: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  border: "#38383A",
  white: "#FFFFFF",
  grey: "#9CA3AF",
} as const;

// Default colors (dark mode)
export const COLORS = DARK_COLORS;

// Theme utilities
export const getColors = (isDark: boolean) => isDark ? DARK_COLORS : LIGHT_COLORS;
