import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { C, T, S, R, SAFE_TOP } from "../theme/tokens";

import { Btn } from "../components/ui";
import { getStats, getDailyStatus } from "../utils/gameHistory";
import { getDailyNumber } from "../utils/questionGenerator";
import { getLocalProfile } from "../utils/supabase";

export default function HomeScreen({ navigation }: any) {
  const dailyNumber = getDailyNumber();
  const [dailyPlayed, setDailyPlayed] = useState<{score: number; correct: number; total: number} | null>(null);
  const [stats, setStats] = useState({ totalGames: 0, bestScore: 0, avgScore: 0, totalCorrect: 0, streak: 0 });
  const [profile, setProfile] = useState<{id: string; nickname: string} | null>(null);

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener("focus", loadData);
    return unsub;
  }, [navigation]);

  const loadData = () => {
    getStats().then(setStats);
    getDailyStatus().then(d => {
      if (d && d.dailyNumber === dailyNumber) setDailyPlayed(d);
      else setDailyPlayed(null);
    });
    getLocalProfile().then(setProfile);
  };

  return (
    <View style={s.container}>
      {/* Header bar with avatar */}
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={s.avatarBtn}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          {profile ? (
            <Text style={s.avatarText}>{profile.nickname.charAt(0).toLocaleUpperCase("tr-TR")}</Text>
          ) : (
            <Text style={s.avatarText}>?</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={s.logoSection}>
          <Text style={s.brandText}>HECE</Text>
          <Text style={[T.bodySm, { color: C.textFaint, letterSpacing: 2 }]}>KELİME BULMACASI</Text>
        </View>

        {/* Streak */}
        {stats.streak > 0 && (
          <View style={s.streakBanner}>
            <Text style={s.streakText}>{"🔥 " + stats.streak + " gün üst üste!"}</Text>
          </View>
        )}

        {/* Game modes */}
        <View style={s.actions}>
          {dailyPlayed ? (
            <View style={s.dailyDone}>
              <Text style={{ fontSize: 20 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[T.h3, { color: C.text }]}>{"Günlük Hece #" + dailyNumber}</Text>
                <Text style={[T.cap, { color: C.textSoft }]}>{dailyPlayed.correct + "/" + dailyPlayed.total + " doğru · " + dailyPlayed.score + " puan"}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={s.dailyCard}
              onPress={() => navigation.navigate("Game", { mode: "daily" })}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 24 }}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[T.h2, { color: C.white }]}>Günlük Hece</Text>
                <Text style={[T.cap, { color: "rgba(255,255,255,0.7)" }]}>{"#" + dailyNumber + " · 14 soru · 2:30"}</Text>
              </View>
              <Text style={[T.h3, { color: C.white }]}>›</Text>
            </TouchableOpacity>
          )}
          <Btn
            label="KLASİK MOD"
            sub="Serbest oyun · 14 soru · 2:30"
            onPress={() => navigation.navigate("Game", { mode: "classic" })}
            variant="outline"
          />
          <Btn
            label="KATEGORİ SEÇ"
            sub="Tematik mod · 10 soru · 1:30"
            onPress={() => navigation.navigate("Category")}
            variant="outline"
          />
        </View>

        {/* Leaderboard button */}
        <TouchableOpacity
          style={s.leaderboardBtn}
          onPress={() => navigation.navigate("Leaderboard")}
          activeOpacity={0.7}
        >
          <Text style={s.leaderboardIcon}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={[T.h3, { color: C.text }]}>Liderlik Tablosu</Text>
            <Text style={[T.cap, { color: C.textFaint }]}>Haftalık ve aylık sıralama</Text>
          </View>
          <Text style={[T.body, { color: C.textFaint }]}>›</Text>
        </TouchableOpacity>

        {/* Stats */}
        {stats.totalGames > 0 && (
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.totalGames}</Text>
              <Text style={s.statLabel}>Oyun</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.bestScore}</Text>
              <Text style={s.statLabel}>En İyi</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.streak}</Text>
              <Text style={s.statLabel}>Seri</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.totalCorrect}</Text>
              <Text style={s.statLabel}>Doğru</Text>
            </View>
          </View>
        )}

        {/* Secondary links */}
        <View style={s.links}>
          <TouchableOpacity onPress={() => navigation.navigate("Achievements")} activeOpacity={0.6}>
            <Text style={[T.btnSm, { color: C.textSoft }]}>Başarımlar</Text>
          </TouchableOpacity>
          <Text style={{ color: C.surfaceLight }}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate("HowToPlay")} activeOpacity={0.6}>
            <Text style={[T.btnSm, { color: C.textSoft }]}>Nasıl Oynanır?</Text>
          </TouchableOpacity>
        </View>

        <Text style={[T.cap, { color: C.textFaint, textAlign: "center", marginTop: S.xl, marginBottom: S.xxl }]}>
          7.000+ kelime ile sınırsız eğlence
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.page,
    paddingTop: 56,
    paddingBottom: S.sm,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.orange,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: C.white,
  },
  scroll: {
    paddingHorizontal: S.page,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: S.xl + 4,
  },
  brandText: {
    fontSize: 42,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -1,
  },
  streakBanner: {
    backgroundColor: C.goldSoft,
    borderRadius: R.lg,
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    marginBottom: S.lg,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.gold,
  },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.orange,
    borderRadius: R.lg,
    padding: S.lg,
    width: "100%",
    gap: S.md,
    marginBottom: S.sm,
  },
  dailyDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    width: "100%",
    gap: S.md,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  actions: {
    width: "100%",
    gap: S.md,
    marginBottom: S.lg,
  },
  leaderboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    width: "100%",
    gap: S.md,
    marginBottom: S.lg,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  leaderboardIcon: {
    fontSize: 28,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.surfaceLight,
    marginBottom: S.lg,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textFaint,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: C.surfaceLight,
  },
  links: {
    flexDirection: "row",
    gap: S.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: S.md,
  },
});
