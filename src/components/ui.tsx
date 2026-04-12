import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { COLORS, TYPO, SP, RADIUS, SHADOW } from "../theme/tokens";

// ─── SCREEN CONTAINER ─────────────────────────────────────
interface ScreenContainerProps {
  children: React.ReactNode;
  centered?: boolean;
  padded?: boolean;
}

export function ScreenContainer({ children, centered = true, padded = true }: ScreenContainerProps) {
  return (
    <View style={[
      componentStyles.screen,
      centered && componentStyles.screenCentered,
      padded && { padding: SP.screen },
    ]}>
      {children}
    </View>
  );
}

// ─── APP BUTTON ───────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface AppButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

const BUTTON_VARIANTS: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: COLORS.primary, border: "transparent", text: COLORS.textOnPrimary },
  secondary: { bg: COLORS.bgCard, border: COLORS.primaryBorder, text: COLORS.textPrimary },
  ghost: { bg: "transparent", border: COLORS.divider, text: COLORS.textSecondary },
  danger: { bg: COLORS.wrongBg, border: COLORS.wrong, text: COLORS.wrong },
};

const BUTTON_SIZES = {
  sm: { paddingVertical: 10, paddingHorizontal: 16 },
  md: { paddingVertical: 14, paddingHorizontal: 20 },
  lg: { paddingVertical: 18, paddingHorizontal: 24 },
};

export function AppButton({ title, subtitle, onPress, variant = "primary", disabled = false, fullWidth = true, size = "md" }: AppButtonProps) {
  const v = BUTTON_VARIANTS[variant];
  const s = BUTTON_SIZES[size];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        componentStyles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        s,
        fullWidth && { width: "100%" },
        variant !== "primary" && variant !== "danger" && { borderWidth: 1 },
        disabled && { opacity: 0.4 },
        variant === "primary" && SHADOW.md,
      ]}
    >
      <Text style={[TYPO.button, { color: v.text }]}>{title}</Text>
      {subtitle && <Text style={[TYPO.caption, { color: v.text, opacity: 0.7, marginTop: 2 }]}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

// ─── APP CARD ─────────────────────────────────────────────
interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "outlined";
}

export function AppCard({ children, style, variant = "default" }: AppCardProps) {
  return (
    <View style={[
      componentStyles.card,
      variant === "elevated" && [componentStyles.cardElevated, SHADOW.md],
      variant === "outlined" && componentStyles.cardOutlined,
      style,
    ]}>
      {children}
    </View>
  );
}

// ─── BADGE ────────────────────────────────────────────────
type BadgeVariant = "primary" | "accent" | "correct" | "wrong" | "skip" | "muted";

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
}

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: COLORS.primaryGlow, text: COLORS.primary },
  accent: { bg: COLORS.accentGlow, text: COLORS.accent },
  correct: { bg: COLORS.correctBg, text: COLORS.correct },
  wrong: { bg: COLORS.wrongBg, text: COLORS.wrong },
  skip: { bg: COLORS.skipBg, text: COLORS.skip },
  muted: { bg: COLORS.divider, text: COLORS.textSecondary },
};

export function Badge({ text, variant = "primary" }: BadgeProps) {
  const c = BADGE_COLORS[variant];
  return (
    <View style={[componentStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[TYPO.points, { color: c.text }]}>{text}</Text>
    </View>
  );
}

// ─── LETTER TILE ──────────────────────────────────────────
interface LetterTileProps {
  letter: string;
  revealed: boolean;
  size?: number;
}

export function LetterTile({ letter, revealed, size = 44 }: LetterTileProps) {
  return (
    <View style={[
      componentStyles.letterTile,
      { width: size, height: size * 1.2 },
      revealed && componentStyles.letterTileRevealed,
      revealed && SHADOW.glow(COLORS.primary),
    ]}>
      <Text style={[
        TYPO.letterTile,
        { color: revealed ? COLORS.letterText : "transparent" },
      ]}>
        {revealed ? letter.toLocaleUpperCase("tr-TR") : " "}
      </Text>
    </View>
  );
}

// ─── STAT ROW ─────────────────────────────────────────────
interface StatRowProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatRow({ label, value, color = COLORS.textSecondary }: StatRowProps) {
  return (
    <View style={componentStyles.statRow}>
      <Text style={[TYPO.bodySm, { color: COLORS.textMuted }]}>{label}</Text>
      <Text style={[TYPO.bodySm, { color, fontWeight: "600" }]}>{String(value)}</Text>
    </View>
  );
}

// ─── DIVIDER ──────────────────────────────────────────────
export function Divider() {
  return <View style={componentStyles.divider} />;
}

// ─── STYLES ───────────────────────────────────────────────
const componentStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  screenCentered: {
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SP.xl,
  },
  cardElevated: {
    backgroundColor: COLORS.bgElevated,
  },
  cardOutlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  badge: {
    paddingHorizontal: SP.md,
    paddingVertical: SP.xs,
    borderRadius: RADIUS.pill,
  },
  letterTile: {
    backgroundColor: COLORS.letterEmpty,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.letterBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  letterTileRevealed: {
    backgroundColor: COLORS.letterRevealed,
    borderColor: COLORS.letterRevealedBorder,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SP.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SP.md,
  },
});