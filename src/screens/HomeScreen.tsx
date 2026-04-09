import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>K</Text>
        </View>
        <Text style={styles.title}>Kelime Oyunu</Text>
        <Text style={styles.subtitle}>Bilginizi test edin!</Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => navigation.navigate("Game")}
        >
          <Text style={styles.playButtonText}>OYNA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {}}
        >
          <Text style={styles.secondaryButtonText}>Skor Tablosu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {}}
        >
          <Text style={styles.secondaryButtonText}>Nasıl Oynanır?</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>64.000+ kelime ile sınırsız eğlence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoLetter: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.white,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  buttonSection: {
    width: "100%",
    gap: 12,
  },
  playButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  playButtonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: COLORS.bgDark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});