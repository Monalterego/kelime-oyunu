import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, T, S, R } from "../theme/tokens";
import { BackBtn } from "../components/ui";
import { ScreenProps } from "../types/navigation";

import { getAchievements, Achievement } from "../utils/achievements";

export default function AchievementsScreen({ navigation }: ScreenProps<"Achievements">) {
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    getAchievements().then(setAchievements);
  }, []);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <View style={[s.container, { paddingTop: insets.top || S.xxxl }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[T.h1, { color: C.text, marginBottom: S.sm }]}>Başarımlar</Text>
        <Text style={[T.bodySm, { color: C.textFaint, marginBottom: S.xl }]}>
          {unlocked.length}/{achievements.length} başarım açıldı
        </Text>

        {unlocked.length > 0 && (
          <>
            {unlocked.map(ach => (
              <View key={ach.id} style={s.card}>
                <Text style={s.icon}>{ach.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[T.h3, { color: C.text }]}>{ach.title}</Text>
                  <Text style={[T.cap, { color: C.textSoft, marginTop: 2 }]}>{ach.description}</Text>
                </View>
                <Text style={[T.cap, { color: C.green }]}>✓</Text>
              </View>
            ))}
          </>
        )}

        {locked.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={[T.bodySm, { color: C.textFaint, marginBottom: S.md }]}>Kilitli</Text>
            {locked.map(ach => (
              <View key={ach.id} style={[s.card, s.cardLocked]}>
                <Text style={[s.icon, { opacity: 0.3 }]}>{ach.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[T.h3, { color: C.textFaint }]}>{ach.title}</Text>
                  <Text style={[T.cap, { color: C.textFaint, marginTop: 2 }]}>{ach.description}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={{ marginVertical: S.lg }}>
        <BackBtn onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: S.page,
    paddingBottom: S.xl,
  },
  card: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.sm,
    gap: S.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  cardLocked: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 28,
  },
  divider: {
    height: 1,
    backgroundColor: C.surfaceLight,
    marginVertical: S.xl,
  },
});
