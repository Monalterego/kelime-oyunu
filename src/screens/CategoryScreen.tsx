import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "../theme/colors";

const CATEGORIES = [
  { id: "Gunluk Hayat", label: "Günlük Hayat", icon: "🏠" },
  { id: "Tarih ve Toplum", label: "Tarih ve Toplum", icon: "📜" },
  { id: "Bilim ve Teknoloji", label: "Bilim ve Teknoloji", icon: "🔬" },
  { id: "Meslekler", label: "Meslekler", icon: "👷" },
  { id: "Sanat ve Kultur", label: "Sanat ve Kültür", icon: "🎨" },
  { id: "Doga ve Hayvanlar", label: "Doğa ve Hayvanlar", icon: "🌿" },
  { id: "Spor ve Saglik", label: "Spor ve Sağlık", icon: "⚽" },
  { id: "Yemek ve Mutfak", label: "Yemek ve Mutfak", icon: "🍳" },
];

export default function CategoryScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kategori Seç</Text>
      <Text style={styles.subtitle}>10 soru, 90 saniye</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryCard}
            onPress={() => navigation.navigate("Game", { mode: "category", category: cat.id })}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
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
  categoryCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgDark, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: COLORS.primaryDark },
  categoryIcon: { fontSize: 28, marginRight: 16 },
  categoryLabel: { fontSize: 17, fontWeight: "600", color: COLORS.white },
  backButton: { backgroundColor: COLORS.bgDark, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16, borderWidth: 1, borderColor: COLORS.primaryDark },
  backButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.textSecondary },
});