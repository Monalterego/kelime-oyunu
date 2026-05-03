import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Btn } from "../components/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, T, S, R } from "../theme/tokens";
import { ScreenProps } from "../types/navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function OnboardingScreen({ navigation }: ScreenProps<"Onboarding">) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setStep(index);
  };

  const handleNext = async () => {
    if (step < SLIDES.length - 1) {
      goTo(step + 1);
    } else {
      await AsyncStorage.setItem("dagarcik_onboarded", "true");
      navigation.replace("Home");
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("dagarcik_onboarded", "true");
    navigation.replace("Home");
  };

  const handleScroll = (e: any) => {
    const newStep = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newStep !== step) setStep(newStep);
  };

  return (
    <View style={[s.container, { paddingTop: (insets.top || S.xxxl) + S.sm }]}>
      <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
        <Text style={[T.btnSm, { color: C.textFaint }]}>Atla</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[s.content, { width: SCREEN_WIDTH }]}>
            <Text style={s.icon}>{slide.icon}</Text>
            <Text style={[T.h1, { color: C.text, marginTop: S.xl, textAlign: "center" }]}>{slide.title}</Text>
            <Text style={[T.body, { color: C.textSoft, marginTop: S.md, textAlign: "center", lineHeight: 26 }]}>{slide.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.bottom}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
        <Btn
          label={step === SLIDES.length - 1 ? "Başlayalım!" : "Devam"}
          onPress={handleNext}
          variant="cta"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.page, paddingBottom: 32 },
  skipBtn: { alignSelf: "flex-end", paddingVertical: S.sm, paddingHorizontal: S.xs },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 72 },
  bottom: { alignItems: "center", gap: S.lg },
  dots: { flexDirection: "row", gap: S.sm, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: C.surfaceLight },
  dotActive: { backgroundColor: C.text, width: 24, borderRadius: 999 },

});
