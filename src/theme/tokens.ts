import { Platform, Dimensions } from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── DESIGN DIRECTION ──────────────────────────────────────
// Warm casual game meets premium dark puzzle.
// Deep navy base + vibrant warm accents (gold for rewards, green for success).
// High contrast, large touch targets, rewarding feedback.
// Inspired by: Wordle's clarity + Trivia Crack's energy + 4Pics1Word's simplicity.

// ─── COLORS ────────────────────────────────────────────────
export const C = {
  // Canvas
  bg: "#0B1121",
  surface: "#131C33",
  surfaceLight: "#1A2542",
  surfaceHover: "#213059",

  // Brand — vibrant blue, used sparingly
  brand: "#4F8EFF",
  brandSoft: "rgba(79, 142, 255, 0.12)",
  brandBorder: "rgba(79, 142, 255, 0.25)",

  // Reward — warm gold, the dopamine color
  gold: "#FFB938",
  goldSoft: "rgba(255, 185, 56, 0.12)",
  goldBorder: "rgba(255, 185, 56, 0.3)",

  // Energy — CTA buttons, urgency
  orange: "#FF6B35",
  orangeSoft: "rgba(255, 107, 53, 0.12)",

  // Feedback
  green: "#34D399",
  greenSoft: "rgba(52, 211, 153, 0.15)",
  greenBorder: "rgba(52, 211, 153, 0.3)",
  red: "#FF4757",
  redSoft: "rgba(255, 71, 87, 0.15)",
  redBorder: "rgba(255, 71, 87, 0.3)",
  purple: "#A78BFA",
  purpleSoft: "rgba(167, 139, 250, 0.12)",

  // Text
  white: "#FFFFFF",
  text: "#E8ECF4",
  textSoft: "#8B95A8",
  textFaint: "#4A5568",

  // Game elements
  tileEmpty: "#151F38",
  tileBorder: "rgba(79, 142, 255, 0.2)",
  tileActive: "#1E2E52",
  tileActiveBorder: "#4F8EFF",
  tileLetter: "#4F8EFF",
};

// ─── TYPOGRAPHY ────────────────────────────────────────────
// Large, bold, confident. Easy to read at a glance during gameplay.
export const T = {
  display: { fontSize: 40, fontWeight: "900" as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "700" as const },
  h3: { fontSize: 18, fontWeight: "600" as const },

  body: { fontSize: 16, fontWeight: "500" as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },

  game: { fontSize: 18, fontWeight: "500" as const, lineHeight: 26 },
  timer: { fontSize: 28, fontWeight: "900" as const, fontVariant: ["tabular-nums" as const] },
  timerBig: { fontSize: 36, fontWeight: "900" as const, fontVariant: ["tabular-nums" as const] },
  tile: { fontSize: 20, fontWeight: "800" as const },
  score: { fontSize: 52, fontWeight: "900" as const },
  scoreLabel: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 2 },

  btn: { fontSize: 17, fontWeight: "800" as const, letterSpacing: 0.5 },
  btnSm: { fontSize: 14, fontWeight: "700" as const },
  badge: { fontSize: 13, fontWeight: "700" as const },
  cap: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
};

// ─── SPACING ───────────────────────────────────────────────
export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  page: 20,
};

// ─── RADIUS ────────────────────────────────────────────────
export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 100,
};

// ─── SHADOWS ───────────────────────────────────────────────
export const SHADOW = Platform.select({
  ios: {
    soft: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
    glow: (color: string) => ({ shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 16 }),
  },
  android: {
    soft: { elevation: 4 },
    glow: (_: string) => ({ elevation: 8 }),
  },
  default: {
    soft: {},
    glow: (_: string) => ({}),
  },
})!;

// ─── LAYOUT HELPERS ────────────────────────────────────────
export const TILE_SIZE = Math.min(44, (SCREEN_W - S.page * 2 - 10 * 9) / 10);