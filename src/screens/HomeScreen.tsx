import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>D</Text>
        </View>
        <Text style={styles.title}>Dağarcık</Text>
        <Text style={styles.subtitle}>Kelime hazinenizi test edin!</Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => navigation.navigate("Game", { mode: "classic" })}
        >
          <Text style={styles.playButtonText}>KLASİK MOD</Text>
          <Text style={styles.playButtonSub}>14 soru, 2.5 dakika, karışık</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => navigation.navigate("Category")}
        >
          <Text style={styles.categoryButtonText}>KATEGORİ MODU</Text>
          <Text style={styles.categoryButtonSub}>10 soru, 90 saniye, seçtiğin konu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
          <Text style={styles.secondaryButtonText}>Nasıl Oynanır?</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>2135 kelime ile sınırsız eğlence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain, justifyContent: "center", alignItems: "center", padding: 24 },
  logoSection: { alignItems: "center", marginBottom: 48 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  logoLetter: { fontSize: 44, fontWeight: "bold", color: COLORS.white },
  title: { fontSize: 36, fontWeight: "bold", color: COLORS.white, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },
  buttonSection: { width: "100%", gap: 12 },
  playButton: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  playButtonText: { fontSize: 20, fontWeight: "bold", color: COLORS.white, letterSpacing: 2 },
  playButtonSub: { fontSize: 12, color: COLORS.accent, marginTop: 4 },
  categoryButton: { backgroundColor: COLORS.bgDark, paddingVertical: 18, borderRadius: 16, alignItems: "center", borderWidth: 2, borderColor: COLORS.primary },
  categoryButtonText: { fontSize: 20, fontWeight: "bold", color: COLORS.primary, letterSpacing: 2 },
  categoryButtonSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  secondaryButton: { backgroundColor: COLORS.bgDark, paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.primaryDark },
  secondaryButtonText: { fontSize: 15, fontWeight: "600", color: COLORS.textSecondary },
  footer: { position: "absolute", bottom: 40, fontSize: 13, color: COLORS.textMuted },
});