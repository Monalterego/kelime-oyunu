import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { COLORS, TYPO, SP, RADIUS, SHADOW } from "../theme/tokens";

const CATEGORIES = [
  { id: "Gunluk Hayat", label: "Günlük Hayat", icon: "🏠", color: "#3B82F6" },
  { id: "Tarih ve Toplum", label: "Tarih ve Toplum", icon: "📜", color: "#8B5CF6" },
  { id: "Bilim ve Teknoloji", label: "Bilim ve Teknoloji", icon: "🔬", color: "#06B6D4" },
  { id: "Meslekler", label: "Meslekler", icon: "👷", color: "#F59E0B" },
  { id: "Sanat ve Kultur", label: "Sanat ve Kültür", icon: "🎨", color: "#EC4899" },
  { id: "Doga ve Hayvanlar", label: "Doğa ve Hayvanlar", icon: "🌿", color: "#10B981" },
  { id: "Spor ve Saglik", label: "Spor ve Sağlık", icon: "⚽", color: "#EF4444" },
  { id: "Yemek ve Mutfak", label: "Yemek ve Mutfak", icon: "🍳", color: "#F97316" },
];

export default function CategoryScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[TYPO.title, { color: COLORS.textBright }]}>Kategori Seç</Text>
        <Text style={[TYPO.bodySm, { color: COLORS.textMuted, marginTop: SP.xs }]}>
          10 soru · 90 saniye
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Game", { mode: "category", category: cat.id })}
          >
            <View style={[styles.iconCircle, { backgroundColor: cat.color + "18" }]}>
              <Text style={styles.icon}>{cat.icon}</Text>
            </View>
            <Text style={[TYPO.body, { color: COLORS.textPrimary, fontWeight: "600", flex: 1 }]}>
              {cat.label}
            </Text>
            <Text style={[TYPO.bodySm, { color: COLORS.textMuted }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.7}
        onPress={() => navigation.goBack()}
      >
        <Text style={[TYPO.buttonSm, { color: COLORS.textSecondary }]}>Geri</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
    paddingHorizontal: SP.screen,
    paddingTop: 60,
    paddingBottom: SP.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: SP["2xl"],
  },
  list: { flex: 1 },
  listContent: {
    gap: SP.sm,
    paddingBottom: SP.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SP.lg,
    gap: SP.lg,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 22,
  },
  backButton: {
    paddingVertical: SP.md,
    alignItems: "center",
    marginTop: SP.sm,
  },
});