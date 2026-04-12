import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { C, T, S, R, SHADOW } from "../theme/tokens";
import { Screen, Btn } from "../components/ui";

export default function HomeScreen({ navigation }: any) {
  return (
    <Screen>
      {/* Background glow */}
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      {/* Logo */}
      <View style={s.logo}>
        <View style={s.logoRing}>
          <View style={s.logoCore}>
            <Text style={s.logoChar}>D</Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={[T.display, { color: C.white, marginTop: S.xl }]}>Dağarcık</Text>
      <Text style={[T.body, { color: C.textSoft, marginTop: S.sm, marginBottom: S.xxxl }]}>
        Kelime hazinenizi sınayın
      </Text>

      {/* Main CTA — the thing you want people to tap */}
      <View style={s.actions}>
        <Btn
          label="OYNA"
          sub="14 soru · 2.5 dakika"
          onPress={() => navigation.navigate("Game", { mode: "classic" })}
          variant="cta"
        />

        <Btn
          label="KATEGORİ SEÇ"
          sub="10 soru · 90 saniye · konulu"
          onPress={() => navigation.navigate("Category")}
          variant="outline"
        />

        <Btn
          label="Nasıl Oynanır?"
          onPress={() => {}}
          variant="ghost"
        />
      </View>

      {/* Footer */}
      <Text style={[T.cap, { color: C.textFaint, position: "absolute", bottom: 36 }]}>
        7.000+ kelime · TDK sözlük veritabanı
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  glowTop: {
    position: "absolute",
    top: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 107, 53, 0.08)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(79, 142, 255, 0.06)",
  },
  logo: {
    alignItems: "center",
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.glow(C.orange),
  },
  logoCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.orange,
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
});