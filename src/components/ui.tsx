import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { C, T, S, R, SHADOW, TILE_SIZE } from "../theme/tokens";

// ─── SCREEN ────────────────────────────────────────────────
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.screen, style]}>{children}</View>;
}

// ─── GAME BUTTON ───────────────────────────────────────────
// The main interactive element. Big, bold, satisfying to tap.
type BtnVariant = "cta" | "primary" | "outline" | "ghost";

interface BtnProps {
  label: string;
  sub?: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  full?: boolean;
}

export function Btn({ label, sub, onPress, variant = "cta", disabled = false, full = true }: BtnProps) {
  const v = BTN_MAP[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        s.btn,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.borderW },
        full && { width: "100%" },
        disabled && { opacity: 0.35 },
        variant === "cta" && SHADOW.soft,
      ]}
    >
      <Text style={[T.btn, { color: v.text }]}>{label}</Text>
      {sub ? <Text style={[T.cap, { color: v.sub, marginTop: 2 }]}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

const BTN_MAP: Record<BtnVariant, { bg: string; border: string; borderW: number; text: string; sub: string }> = {
  cta: { bg: C.orange, border: "transparent", borderW: 0, text: C.white, sub: "rgba(255,255,255,0.65)" },
  primary: { bg: C.brand, border: "transparent", borderW: 0, text: C.white, sub: "rgba(255,255,255,0.75)" },
  outline: { bg: C.surface, border: C.tileBorder, borderW: 1.5, text: C.text, sub: C.textSoft },
  ghost: { bg: "transparent", border: "transparent", borderW: 0, text: C.textSoft, sub: C.textFaint },
};

// ─── CHIP / BADGE ──────────────────────────────────────────
// Small info nuggets. Points, status, hints.
type ChipColor = "gold" | "brand" | "green" | "red" | "purple" | "muted";

export function Chip({ text, color = "brand" }: { text: string; color?: ChipColor }) {
  const m = CHIP_MAP[color];
  return (
    <View style={[s.chip, { backgroundColor: m.bg }]}>
      <Text style={[T.badge, { color: m.text }]}>{text}</Text>
    </View>
  );
}

const CHIP_MAP: Record<ChipColor, { bg: string; text: string }> = {
  gold: { bg: C.goldSoft, text: C.gold },
  brand: { bg: C.brandSoft, text: C.brand },
  green: { bg: C.greenSoft, text: C.green },
  red: { bg: C.redSoft, text: C.red },
  purple: { bg: C.purpleSoft, text: C.purple },
  muted: { bg: C.surfaceLight, text: C.textSoft },
};

// ─── CARD ──────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// ─── LETTER TILE ───────────────────────────────────────────
// The star of the show. Each tile is a mini-reward when revealed.
export function Tile({ letter, revealed }: { letter: string; revealed: boolean }) {
  return (
    <View style={[
      s.tile,
      revealed && s.tileRevealed,
      revealed && SHADOW.glow(C.brand),
    ]}>
      <Text style={[T.tile, { color: revealed ? C.tileLetter : "transparent" }]}>
        {revealed ? letter.toLocaleUpperCase("tr-TR") : " "}
      </Text>
    </View>
  );
}

// ─── PROGRESS DOTS ─────────────────────────────────────────
// Shows question progress like ●●●○○○○ — satisfying to fill up
export function ProgressDots({ current, total, correct }: { current: number; total: number; correct: boolean[] }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: total }, (_, i) => {
        let dotColor = C.surfaceLight;
        if (i < correct.length) {
          dotColor = correct[i] ? C.green : C.red;
        } else if (i === current) {
          dotColor = C.brand;
        }
        return <View key={i} style={[s.dot, { backgroundColor: dotColor }]} />;
      })}
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: S.page,
  },
  btn: {
    borderRadius: R.lg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: S.md,
    paddingVertical: S.xs + 1,
    borderRadius: R.pill,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.xl,
    width: "100%",
    borderWidth: 1,
    borderColor: C.surfaceLight,
    ...SHADOW.soft,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.15,
    backgroundColor: C.tileEmpty,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: C.tileBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  tileRevealed: {
    backgroundColor: C.tileActive,
    borderColor: C.tileActiveBorder,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
