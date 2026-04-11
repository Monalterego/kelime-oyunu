import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "../theme/colors";

const CATEGORIES = [
  { id: "Gunluk Hayat", label: "Günlük Hayat", icon: "🏠", count: 763 },
  { id: "Tarih ve Toplum", label: "Tarih ve Toplum", icon: "📜", count: 301 },
  { id: "Bilim ve Teknoloji", label: "Bilim ve Teknoloji", icon: "🔬", count: 230 },
  { id: "Meslekler", label: "Meslekler", icon: "👷", count: 199 },
  { id: "Sanat ve Kultur", label: "Sanat ve Kültür", icon: "🎨", count: 198 },
  { id: "Doga ve Hayvanlar", label: "Doğa ve Hayvanlar", icon: "🌿", count: 192 },
  { id: "Spor ve Saglik", label: "Spor ve Sağlık", icon: "⚽", count: 148 },
  { id: "Yemek ve Mutfak", label: "Yemek ve Mutfak", icon: "🍳", count: 104 },
];

export default function CategoryScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kategori Seç</Text>
      <Text style={styles.subtitle}>10 soru, 2 dakika</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryCard}
            onPress={() => navigation.navigate("Game", { mode: "category", category: cat.id })}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Text style={styles.categoryCount}>{cat.count} kelime</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Geri</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "bold", color: COLORS.white, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", marginBottom: 24 },
  list: { flex: 1 },
  listContent: { gap: 10 },
  categoryCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgDark, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.primaryDark },
  categoryIcon: { fontSize: 28, marginRight: 16 },
  categoryInfo: { flex: 1 },
  categoryLabel: { fontSize: 17, fontWeight: "600", color: COLORS.white },
  categoryCount: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  backButton: { backgroundColor: COLORS.bgDark, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16, borderWidth: 1, borderColor: COLORS.primaryDark },
  backButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.textSecondary },
});