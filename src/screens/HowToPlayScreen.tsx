import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { C, T, S, R, SAFE_TOP } from "../theme/tokens";


const STEPS = [
  {
    number: "1",
    title: "Tanımı Oku",
    description: "Her soruda bir kelimenin tanımı gösterilir. Tanımdan kelimeyi tahmin etmeye çalış.",
    tip: "İpucu: Birkaç saniye sonra ekranda köken bilgisi ve ek ipucu belirecek.",
  },
  {
    number: "2",
    title: "Cevabını Yaz",
    description: "CEVAPLA butonuna bas ve kelimeyi yaz. 12 saniye süren var. Emin değilsen HARF AL ile ipucu alabilirsin.",
    tip: "Her açılan harf 100 puan düşürür. Son harf açılamaz.",
  },
  {
    number: "3",
    title: "Puan Topla",
    description: "Doğru cevap: harf sayısı × 100 puan. Yanlış cevap: tam puan kaybı. PAS GEÇ: %25 puan kaybı.",
    tip: "Kısa kelimeler az puan, uzun kelimeler çok puan eder.",
  },
];

const MODES = [
  {
    title: "Günlük Hece",
    desc: "Her gün aynı 14 soru, herkes için aynı. Günde bir kez oyna, arkadaşlarınla yarış!",
  },
  {
    title: "Klasik Mod",
    desc: "14 soru, 2.5 dakika. 4 ile 10 harfli karışık kelimeler. Kolaydan zora gider.",
  },
  {
    title: "Kategori Modu",
    desc: "10 soru, 90 saniye. Seçtiğin konudan sorular gelir: Tarih, Bilim, Yemek ve daha fazlası.",
  },
];

export default function HowToPlayScreen({ navigation }: any) {
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[T.h1, { color: C.text, marginBottom: S.sm }]}>Nasıl Oynanır?</Text>
        <Text style={[T.bodySm, { color: C.textFaint, marginBottom: S.xl }]}>
          Hece, kelime hazinenizi sınayan bir bilgi oyunudur.
        </Text>

        {STEPS.map((step) => (
          <View key={step.number} style={s.stepCard}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>{step.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.h3, { color: C.text }]}>{step.title}</Text>
              <Text style={[T.bodySm, { color: C.textSoft, marginTop: S.xs }]}>{step.description}</Text>
              <View style={s.tipBox}>
                <Text style={[T.cap, { color: C.gold }]}>{step.tip}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={s.divider} />

        <Text style={[T.h2, { color: C.text, marginBottom: S.md }]}>Oyun Modları</Text>

        {MODES.map((mode) => (
          <View key={mode.title} style={s.modeCard}>
            <Text style={[T.h3, { color: C.text }]}>{mode.title}</Text>
            <Text style={[T.bodySm, { color: C.textSoft, marginTop: S.xs }]}>{mode.desc}</Text>
          </View>
        ))}

        <View style={s.divider} />

        <Text style={[T.h2, { color: C.text, marginBottom: S.md }]}>Puanlama</Text>
        <View style={s.scoreTable}>
          <View style={s.scoreRow}>
            <Text style={[T.bodySm, { color: C.green, flex: 1 }]}>✓ Doğru cevap</Text>
            <Text style={[T.bodySm, { color: C.textSoft }]}>harf × 100 puan</Text>
          </View>
          <View style={s.scoreRow}>
            <Text style={[T.bodySm, { color: C.red, flex: 1 }]}>✗ Yanlış cevap</Text>
            <Text style={[T.bodySm, { color: C.textSoft }]}>-harf × 100 puan</Text>
          </View>
          <View style={s.scoreRow}>
            <Text style={[T.bodySm, { color: C.purple, flex: 1 }]}>⊘ Pas geçme</Text>
            <Text style={[T.bodySm, { color: C.textSoft }]}>-%25 puan</Text>
          </View>
          <View style={s.scoreRow}>
            <Text style={[T.bodySm, { color: C.gold, flex: 1 }]}>Harf alma</Text>
            <Text style={[T.bodySm, { color: C.textSoft }]}>her harf -100P</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Text style={[T.btn, { color: C.white }]}>Anladım, Oynayalım!</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: SAFE_TOP,
  },
  scroll: {
    paddingHorizontal: S.page,
    paddingBottom: S.xl,
  },
  stepCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.sm,
    gap: S.md,
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.brand,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: "800",
    color: C.white,
  },
  tipBox: {
    backgroundColor: C.goldSoft,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    marginTop: S.sm,
  },
  divider: {
    height: 1,
    backgroundColor: C.surfaceLight,
    marginVertical: S.xl,
  },
  modeCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  scoreTable: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: S.sm,
  },
  backBtn: {
    backgroundColor: C.orange,
    marginHorizontal: S.page,
    marginBottom: S.xl,
    paddingVertical: 16,
    borderRadius: R.lg,
    alignItems: "center",
  },
});
