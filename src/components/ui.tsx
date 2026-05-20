import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { C, T, S, R, SHADOW, TILE_SIZE, getTileSize } from "../theme/tokens";

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
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ disabled }}
      style={[
        s.btn,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.borderW },
        full && { width: "100%" },
        disabled && { opacity: 0.5 },
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
export function Tile({ letter, revealed, size, typedLetter }: {
  letter: string;
  revealed: boolean;
  size?: number;
  typedLetter?: string;
}) {
  const sz = size ?? TILE_SIZE;
  const isTyped = !revealed && !!typedLetter;
  return (
    <View
      style={[
        s.tile,
        { width: sz, height: sz * 1.15 },
        revealed && s.tileRevealed,
        revealed && SHADOW.glow(C.brand),
        isTyped && s.tileTyped,
      ]}
      accessibilityLabel={
        revealed
          ? letter.toLocaleUpperCase("tr-TR")
          : isTyped
          ? typedLetter!.toLocaleUpperCase("tr-TR")
          : "gizli harf"
      }
    >
      <Text style={[
        T.tile,
        {
          fontSize: Math.max(14, sz * 0.38),
          color: revealed ? C.tileLetter : isTyped ? C.orange : "transparent",
        },
      ]}>
        {revealed
          ? letter.toLocaleUpperCase("tr-TR")
          : isTyped
          ? typedLetter!.toLocaleUpperCase("tr-TR")
          : " "}
      </Text>
    </View>
  );
}

// ─── BACK BUTTON ───────────────────────────────────────────
export function BackBtn({ onPress, label = "Geri Dön" }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity style={s.backBtn} onPress={onPress} activeOpacity={0.6}>
      <ArrowLeft size={16} color={C.textSoft} strokeWidth={2} />
      <Text style={[T.btnSm, { color: C.textSoft, marginLeft: 6 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── PROGRESS DOTS ─────────────────────────────────────────
// Shows question progress like ●●●○○○○ — satisfying to fill up
export function ProgressDots({
  current, total, correct, skipped,
}: {
  current: number;
  total: number;
  correct: boolean[];
  skipped?: boolean[];
}) {
  return (
    <View style={s.dots}>
      {Array.from({ length: total }, (_, i) => {
        let dotColor = C.textFaint + "50";
        if (i < correct.length) {
          if (correct[i]) dotColor = C.green;
          else if (skipped?.[i]) dotColor = C.orange;
          else dotColor = C.red;
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
    minHeight: 56,
    borderRadius: R.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
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
  tileTyped: {
    borderColor: C.orange,
    backgroundColor: C.surface,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  backBtn: {
    paddingVertical: S.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
