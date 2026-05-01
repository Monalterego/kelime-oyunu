import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Home, ScrollText, FlaskConical, HardHat, Palette, Leaf, Dumbbell, UtensilsCrossed, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, T, S, R } from "../theme/tokens";
import { BackBtn } from "../components/ui";
import { ScreenProps } from "../types/navigation";


const CATEGORIES = [
  { id: "Gunluk Hayat", label: "Günlük Hayat", Icon: Home, accent: "#2E5B8C" },
  { id: "Tarih ve Toplum", label: "Tarih ve Toplum", Icon: ScrollText, accent: "#6B5CA5" },
  { id: "Bilim ve Teknoloji", label: "Bilim ve Teknoloji", Icon: FlaskConical, accent: "#4D8B55" },
  { id: "Meslekler", label: "Meslekler", Icon: HardHat, accent: "#C5962C" },
  { id: "Sanat ve Kultur", label: "Sanat ve Kültür", Icon: Palette, accent: "#B44545" },
  { id: "Doga ve Hayvanlar", label: "Doğa ve Hayvanlar", Icon: Leaf, accent: "#3D7663" },
  { id: "Spor ve Saglik", label: "Spor ve Sağlık", Icon: Dumbbell, accent: "#1F1F1F" },
  { id: "Yemek ve Mutfak", label: "Yemek ve Mutfak", Icon: UtensilsCrossed, accent: "#866D3A" },
];


export default function CategoryScreen({ navigation }: ScreenProps<"Category">) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top || S.xxxl }]}>
      <View style={s.header}>
        <Text style={[T.h1, { color: C.text }]}>Kategori Seç</Text>
        <Text style={[T.bodySm, { color: C.textFaint, marginTop: S.xs }]}>
          10 soru · 90 saniye
        </Text>
      </View>

      <View style={s.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.card, { borderLeftColor: cat.accent }]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Game", { mode: "category", category: cat.id })}
          >
            <View style={[s.iconBadge, { backgroundColor: `${cat.accent}14` }]}>
              <cat.Icon size={20} color={cat.accent} strokeWidth={2} />
            </View>
            <Text style={[T.h3, { color: C.text, flex: 1 }]}>{cat.label}</Text>
            <ChevronRight size={16} color={C.textFaint} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>

      <BackBtn onPress={() => navigation.goBack()} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: S.page,
    paddingBottom: S.lg,
  },
  header: {
    marginBottom: S.md,
  },
  grid: {
    flex: 1,
    gap: S.sm,
    justifyContent: "center",
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 11,
    paddingHorizontal: S.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
