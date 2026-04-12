import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { C, T, S, R } from "../theme/tokens";

const CATEGORIES = [
  { id: "Gunluk Hayat", label: "Günlük Hayat", icon: "🏠", accent: "#4F8EFF" },
  { id: "Tarih ve Toplum", label: "Tarih ve Toplum", icon: "📜", accent: "#A78BFA" },
  { id: "Bilim ve Teknoloji", label: "Bilim ve Teknoloji", icon: "🔬", accent: "#22D3EE" },
  { id: "Meslekler", label: "Meslekler", icon: "👷", accent: "#FFB938" },
  { id: "Sanat ve Kultur", label: "Sanat ve Kültür", icon: "🎨", accent: "#F472B6" },
  { id: "Doga ve Hayvanlar", label: "Doğa ve Hayvanlar", icon: "🌿", accent: "#34D399" },
  { id: "Spor ve Saglik", label: "Spor ve Sağlık", icon: "⚽", accent: "#FF6B35" },
  { id: "Yemek ve Mutfak", label: "Yemek ve Mutfak", icon: "🍳", accent: "#FB923C" },
];

export default function CategoryScreen({ navigation }: any) {
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[T.h1, { color: C.white }]}>Kategori Seç</Text>
        <Text style={[T.bodySm, { color: C.textFaint, marginTop: S.xs }]}>
          10 soru · 90 saniye
        </Text>
      </View>

      {/* Grid of categories */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.card, { borderLeftColor: cat.accent }]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Game", { mode: "category", category: cat.id })}
          >
            <Text style={s.cardIcon}>{cat.icon}</Text>
            <Text style={[T.h3, { color: C.text }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Back */}
      <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} activeOpacity={0.6}>
        <Text style={[T.btnSm, { color: C.textSoft }]}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: S.page,
    paddingTop: 56,
    paddingBottom: S.lg,
  },
  header: {
    marginBottom: S.xl,
  },
  scroll: { flex: 1 },
  grid: {
    gap: S.sm,
    paddingBottom: S.lg,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 18,
    paddingHorizontal: S.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: S.lg,
    borderLeftWidth: 4,
  },
  cardIcon: {
    fontSize: 26,
  },
  back: {
    paddingVertical: S.md,
    alignItems: "center",
  },
});