import { Platform } from "react-native";

// ─── COLOR SYSTEM ─────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bgBase: "#060B18",
  bgElevated: "#0C1529",
  bgCard: "#111D35",
  bgCardHover: "#162647",
  bgInput: "#0A1223",

  // Primary brand
  primary: "#3B82F6",
  primaryMuted: "#2563EB",
  primaryGlow: "rgba(59, 130, 246, 0.15)",
  primaryBorder: "rgba(59, 130, 246, 0.3)",

  // Accent (warm gold for scores/rewards)
  accent: "#F59E0B",
  accentGlow: "rgba(245, 158, 11, 0.15)",

  // Text hierarchy
  textBright: "#F8FAFC",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  textMuted: "#475569",
  textOnPrimary: "#FFFFFF",

  // Semantic
  correct: "#10B981",
  correctBg: "rgba(16, 185, 129, 0.12)",
  wrong: "#EF4444",
  wrongBg: "rgba(239, 68, 68, 0.12)",
  warning: "#F59E0B",
  skip: "#6366F1",
  skipBg: "rgba(99, 102, 241, 0.12)",

  // Game-specific
  letterEmpty: "#0F1A30",
  letterBorder: "rgba(59, 130, 246, 0.25)",
  letterRevealed: "#1E3A5F",
  letterRevealedBorder: "#3B82F6",
  letterText: "#3B82F6",
  timerDanger: "#EF4444",
  timerWarning: "#F59E0B",

  // Utility
  divider: "rgba(148, 163, 184, 0.08)",
  overlay: "rgba(6, 11, 24, 0.85)",
};

// ─── TYPOGRAPHY ───────────────────────────────────────────
export const TYPO = {
  // Display
  hero: { fontSize: 44, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 20, fontWeight: "600" as const },

  // Body
  bodyLg: { fontSize: 18, fontWeight: "400" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },

  // UI elements
  button: { fontSize: 16, fontWeight: "700" as const, letterSpacing: 1 },
  buttonSm: { fontSize: 14, fontWeight: "600" as const, letterSpacing: 0.5 },
  caption: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 0.3 },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1.5 },

  // Game
  timer: { fontSize: 32, fontWeight: "800" as const, fontVariant: ["tabular-nums" as const] },
  letterTile: { fontSize: 22, fontWeight: "700" as const },
  score: { fontSize: 48, fontWeight: "800" as const },
  points: { fontSize: 14, fontWeight: "700" as const },
};

// ─── SPACING ──────────────────────────────────────────────
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  screen: 20,
} as const;

// ─── RADIUS ───────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
  circle: 9999,
} as const;

// ─── SHADOWS (React Native friendly) ─────────────────────
export const SHADOW = {
  sm: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
    android: { elevation: 8 },
  }),
  glow: (color: string) => Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 },
    android: { elevation: 6 },
  }),
};