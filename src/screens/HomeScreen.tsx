import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { C, T, S, R } from "../theme/tokens";
import { Screen, Btn } from "../components/ui";
import { getStats } from "../utils/gameHistory";
import { useFocusEffect } from "@react-navigation/native";

export default function HomeScreen({ navigation }: any) {
  const [stats, setStats] = useState({ totalGames: 0, bestScore: 0, avgScore: 0, totalCorrect: 0, streak: 0 });

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
    }, [])
  );
  return (
    <Screen>
      <View style={s.gridTexture} />

      {/* Logo */}
      <View style={s.logo}>
        <View style={s.logoRing}>
          <View style={s.logoCore}>
            <Text style={s.logoChar}>Ğ</Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={[T.display, { color: C.text, marginTop: S.xl }]}>Dağarcık</Text>
      <Text style={[T.body, { color: C.textSoft, marginTop: S.sm, marginBottom: S.xxxl }]}>
        Her gün yeni bir kelime bulmacası
      </Text>

      {/* Main CTA — the thing you want people to tap */}
      <View style={s.actions}>
        <Btn
          label="OYNA"
          sub="Günün oyunu · 14 soru · 2:30"
          onPress={() => navigation.navigate("Game", { mode: "classic" })}
          variant="cta"
        />

        <Btn
          label="KATEGORİ SEÇ"
          sub="Tematik mod · 10 soru · 1:30"
          onPress={() => navigation.navigate("Category")}
          variant="outline"
        />

        <Btn
          label="Nasıl Oynanır?"
          onPress={() => navigation.navigate("HowToPlay")}
          variant="ghost"
        />
      </View>

      {/* Stats */}
      {stats.totalGames > 0 && (
        <View style={s.statsCard}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{stats.totalGames}</Text>
            <Text style={s.statLabel}>Oyun</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{stats.bestScore}</Text>
            <Text style={s.statLabel}>En İyi</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{stats.streak}</Text>
            <Text style={s.statLabel}>Seri</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{stats.totalCorrect}</Text>
            <Text style={s.statLabel}>Doğru</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={[T.cap, { color: C.textFaint, position: "absolute", bottom: 36 }]}>
        NYT Games tarzı sade arayüz · 7.000+ kelime
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  gridTexture: {
    position: "absolute",
    inset: 0,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  logo: {
    alignItems: "center",
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.tileBorder,
  },
  logoCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.text,
    justifyContent: "center",
    alignItems: "center",
  },
  logoChar: {
    fontSize: 44,
    fontWeight: "900",
    color: C.white,
    marginTop: -2,
  },
  actions: {
    width: "100%",
    gap: S.md,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginTop: S.xl,
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textFaint,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: C.surfaceLight,
  },
});
