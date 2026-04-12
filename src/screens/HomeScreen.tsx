import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, TYPO, SP, RADIUS, SHADOW } from "../theme/tokens";
import { ScreenContainer, AppButton } from "../components/ui";

export default function HomeScreen({ navigation }: any) {
  return (
    <ScreenContainer>
      {/* Ambient glow */}
      <View style={styles.glowOrb} />

      {/* Logo section */}
      <View style={styles.logoSection}>
        <View style={styles.logoOuter}>
          <View style={styles.logoInner}>
            <Text style={styles.logoText}>D</Text>
          </View>
        </View>
        <Text style={[TYPO.hero, { color: COLORS.textBright, marginTop: SP["2xl"] }]}>
          Dağarcık
        </Text>
        <Text style={[TYPO.body, { color: COLORS.textSecondary, marginTop: SP.sm }]}>
          Kelime hazinenizi test edin
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton
          title="KLASİK MOD"
          subtitle="14 soru · 2.5 dakika · karışık"
          onPress={() => navigation.navigate("Game", { mode: "classic" })}
          size="lg"
        />

        <AppButton
          title="KATEGORİ MODU"
          subtitle="10 soru · 90 saniye · seçtiğin konu"
          onPress={() => navigation.navigate("Category")}
          variant="secondary"
          size="lg"
        />

        <AppButton
          title="Nasıl Oynanır?"
          onPress={() => {}}
          variant="ghost"
          size="sm"
        />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>7.000+ kelime ile sınırsız eğlence</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  glowOrb: {
    position: "absolute",
    top: -120,
    alignSelf: "center",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.5,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: SP["5xl"],
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.glow(COLORS.primary),
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.textOnPrimary,
  },
  actions: {
    width: "100%",
    gap: SP.md,
  },
  footer: {
    position: "absolute",
    bottom: SP["4xl"],
    ...TYPO.caption,
    color: COLORS.textMuted,
  },
});