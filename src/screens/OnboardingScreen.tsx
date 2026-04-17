import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, T, S, R } from "../theme/tokens";

const SLIDES = [
  {
    icon: "📖",
    title: "Tanımı Oku",
    desc: "Her soruda bir kelimenin tanımı verilir.\nTanımdan kelimeyi tahmin et!",
  },
  {
    icon: "⌨️",
    title: "Cevabını Yaz",
    desc: "CEVAPLA butonuna bas, kelimeyi yaz.\nTakılırsan HARF AL ile ipucu al.",
  },
  {
    icon: "🏆",
    title: "Puan Topla",
    desc: "Doğru cevap = puan kazan!\nGünlük modda arkadaşlarınla yarış.",
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await AsyncStorage.setItem("dagarcik_onboarded", "true");
      navigation.replace("Home");
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("dagarcik_onboarded", "true");
    navigation.replace("Home");
  };

  const slide = SLIDES[step];

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
        <Text style={[T.btnSm, { color: C.textFaint }]}>Atla</Text>
      </TouchableOpacity>
      <View style={s.content}>
        <Text style={s.icon}>{slide.icon}</Text>
        <Text style={[T.h1, { color: C.text, marginTop: S.xl, textAlign: "center" }]}>{slide.title}</Text>
        <Text style={[T.body, { color: C.textSoft, marginTop: S.md, textAlign: "center", lineHeight: 26 }]}>{slide.desc}</Text>
      </View>
      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.7}>
          <Text style={[T.btn, { color: C.white }]}>{step === SLIDES.length - 1 ? "Başlayalım!" : "Devam"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.page, paddingTop: 60, paddingBottom: 40 },
  skipBtn: { alignSelf: "flex-end", padding: S.sm },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 72 },
  bottom: { alignItems: "center", gap: S.xl },
  dots: { flexDirection: "row", gap: S.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.surfaceLight },
  dotActive: { backgroundColor: C.text, width: 24 },
  nextBtn: { backgroundColor: C.orange, borderRadius: R.lg, paddingVertical: 16, width: "100%", alignItems: "center" },
});
