import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { C, T, S } from "../theme/tokens";
import { Screen, Btn } from "../components/ui";

export default function HomeScreen({ navigation }: any) {
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
});
