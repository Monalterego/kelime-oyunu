import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { C, T, S, R } from "../theme/tokens";
import { getLocalProfile, createProfile } from "../utils/supabase";
import { getStats, getGameHistory, GameRecord } from "../utils/gameHistory";
import { getAchievements } from "../utils/achievements";
import { Btn } from "../components/ui";

export default function ProfileScreen({ navigation }: any) {
  const [nickname, setNickname] = useState("");
  const [profile, setProfile] = useState<{ id: string; nickname: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGames: 0, bestScore: 0, avgScore: 0, totalCorrect: 0, streak: 0 });
  const [achCount, setAchCount] = useState({ total: 0, unlocked: 0 });
  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);

  useEffect(() => {
    getLocalProfile().then(p => {
      setProfile(p);
      setLoading(false);
    });
    getStats().then(setStats);
    getAchievements().then(achs => {
      setAchCount({ total: achs.length, unlocked: achs.filter(a => a.unlocked).length });
    });
    getGameHistory().then(h => setRecentGames(h.slice(0, 5)));
  }, []);

  const handleCreate = async () => {
    if (nickname.trim().length < 3) { setError("En az 3 karakter olmali"); return; }
    if (nickname.trim().length > 15) { setError("En fazla 15 karakter olabilir"); return; }
    setError("");
    const result = await createProfile(nickname.trim());
    if (result) { setProfile(result); } else { setError("Bu isim alinmis, baska bir isim dene"); }
  };

  if (loading) return null;

  if (profile) {
    const modeLabel = (m: string) => m === "daily" ? "Gunluk" : m === "category" ? "Kategori" : "Klasik";
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.avatarSection}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{profile.nickname.charAt(0).toLocaleUpperCase("tr-TR")}</Text>
            </View>
            <Text style={[T.h1, { color: C.text, marginTop: S.lg }]}>{profile.nickname}</Text>
          </View>

          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{stats.totalGames}</Text>
              <Text style={s.statLabel}>Oyun</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>{stats.bestScore}</Text>
              <Text style={s.statLabel}>En Iyi</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>{stats.avgScore}</Text>
              <Text style={s.statLabel}>Ortalama</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>{stats.streak}</Text>
              <Text style={s.statLabel}>Seri</Text>
            </View>
          </View>

          <TouchableOpacity style={s.achCard} onPress={() => navigation.navigate("Achievements")} activeOpacity={0.7}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={[T.h3, { color: C.text }]}>Basarimlar</Text>
              <Text style={[T.cap, { color: C.textFaint }]}>{achCount.unlocked}/{achCount.total} acildi</Text>
            </View>
            <Text style={[T.body, { color: C.textFaint }]}>›</Text>
          </TouchableOpacity>

          {recentGames.length > 0 && (
            <>
              <Text style={[T.h3, { color: C.text, marginTop: S.xl, marginBottom: S.md }]}>Son Oyunlar</Text>
              {recentGames.map((g, i) => (
                <View key={g.id} style={s.gameRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.bodySm, { color: C.text, fontWeight: "600" }]}>{modeLabel(g.mode)}{g.category ? " - " + g.category : ""}</Text>
                    <Text style={[T.cap, { color: C.textFaint }]}>{g.correct}/{g.total} dogru</Text>
                  </View>
                  <Text style={[T.h3, { color: g.score >= 0 ? C.green : C.red }]}>{g.score}</Text>
                </View>
              ))}
            </>
          )}

          <View style={{ marginTop: S.xxl, gap: S.md }}>
            <Btn label="Liderlik Tablosu" onPress={() => navigation.navigate("Leaderboard")} variant="cta" />
            <Btn label="Geri Don" onPress={() => navigation.goBack()} variant="ghost" />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.createContent}>
        <Text style={[T.h1, { color: C.text }]}>Profil Olustur</Text>
        <Text style={[T.bodySm, { color: C.textSoft, marginTop: S.sm, textAlign: "center" }]}>
          Liderlik tablosunda yer almak icin bir kullanici adi sec
        </Text>
        <TextInput
          style={s.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="Kullanici adi..."
          placeholderTextColor={C.textFaint}
          autoCapitalize="none"
          maxLength={15}
        />
        {error ? <Text style={[T.bodySm, { color: C.red, marginTop: S.sm }]}>{error}</Text> : null}
      </View>
      <View style={s.createActions}>
        <Btn label="Kaydet" onPress={handleCreate} variant="cta" />
        <Btn label="Simdilik Gec" onPress={() => navigation.goBack()} variant="ghost" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: S.page, paddingTop: 60, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginBottom: S.xxl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 36, fontWeight: "900", color: C.white },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.lg },
  statBox: { flex: 1, minWidth: "45%", backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, alignItems: "center", borderWidth: 1, borderColor: C.surfaceLight },
  statNum: { fontSize: 24, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 11, fontWeight: "600", color: C.textFaint, marginTop: 4 },
  achCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, gap: S.md, borderWidth: 1, borderColor: C.goldBorder },
  gameRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.sm, borderWidth: 1, borderColor: C.surfaceLight },
  createContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: S.page },
  createActions: { gap: S.md, paddingHorizontal: S.page, paddingBottom: 40 },
  input: { width: "100%", backgroundColor: C.surface, borderWidth: 2, borderColor: C.surfaceLight, borderRadius: R.lg, padding: S.lg, marginTop: S.xl, fontSize: 18, fontWeight: "600", color: C.text, textAlign: "center" },
});
