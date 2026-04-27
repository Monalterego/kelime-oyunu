import { Platform, Dimensions } from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── DESIGN DIRECTION ──────────────────────────────────────
// NYT Games inspired modern style:
// calm paper background, neutral grays, restrained accents.
// Clear hierarchy, high readability, tactile letter tiles.

// ─── COLORS ────────────────────────────────────────────────
export const C = {
  // Canvas
  bg: "#F7F6F2",
  surface: "#FFFFFF",
  surfaceLight: "#ECEAE3",
  surfaceHover: "#E3E0D8",

  // Brand — restrained editorial blue
  brand: "#2E5B8C",
  brandSoft: "rgba(46, 91, 140, 0.12)",
  brandBorder: "rgba(46, 91, 140, 0.24)",

  // Reward
  gold: "#C5962C",
  goldSoft: "rgba(197, 150, 44, 0.13)",
  goldBorder: "rgba(197, 150, 44, 0.3)",

  // Energy — muted ink
  orange: "#E8722A",
  orangeSoft: "rgba(232, 114, 42, 0.12)",

  // Feedback
  green: "#4D8B55",
  greenSoft: "rgba(52, 211, 153, 0.15)",
  greenBorder: "rgba(52, 211, 153, 0.3)",
  red: "#B44545",
  redSoft: "rgba(255, 71, 87, 0.15)",
  redBorder: "rgba(255, 71, 87, 0.3)",
  purple: "#6B5CA5",
  purpleSoft: "rgba(167, 139, 250, 0.12)",

  // Text
  white: "#FFFFFF",
  text: "#1F1F1F",
  textSoft: "#5E5A53",
  textFaint: "#6B6560",

  // Game elements
  tileEmpty: "#E3E0D8",
  tileBorder: "#CBC6BA",
  tileActive: "#FFFFFF",
  tileActiveBorder: "#2E5B8C",
  tileLetter: "#1A1A1A",
};

// ─── TYPOGRAPHY ────────────────────────────────────────────
// Large, bold, confident. Easy to read at a glance during gameplay.
export const T = {
  display: { fontSize: 40, fontWeight: "900" as const, letterSpacing: -1.2 },
  h1: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.6 },
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

  btn: { fontSize: 17, fontWeight: "800" as const, letterSpacing: 0.4 },
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
  lg: 14,
  xl: 20,
  xxl: 24,
  pill: 100,
};

// ─── SHADOWS ───────────────────────────────────────────────
export const SHADOW = Platform.select({
  ios: {
    soft: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
    glow: (color: string) => ({ shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 10 }),
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
export const SAFE_TOP = 56;

export const TILE_SIZE = Math.min(52, (SCREEN_W - S.page * 2 - 10 * 7) / 10);

export function getTileSize(wordLength: number): number {
  const gap = 6;
  const available = SCREEN_W - S.page * 2 - gap * (wordLength - 1);
  return Math.max(28, Math.min(52, Math.floor(available / wordLength)));
}
