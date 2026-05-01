import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, T, S, R } from "../theme/tokens";

import { getLocalProfile, createProfile } from "../utils/supabase";
import { ScreenProps } from "../types/navigation";
import { getStats, getGameHistory, GameRecord } from "../utils/gameHistory";
import { getAchievements } from "../utils/achievements";
import { Btn, BackBtn } from "../components/ui";

export default function ProfileScreen({ navigation }: ScreenProps<"Profile">) {
  const insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState("");
  const [profile, setProfile] = useState<{ id: string; nickname: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGames: 0, bestScore: 0, avgScore: 0, totalCorrect: 0, streak: 0 });
  const [achCount, setAchCount] = useState({ total: 0, unlocked: 0 });
  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);

  useEffect(() => {
    getLocalProfile().then(p => { setProfile(p); setLoading(false); });
    getStats().then(setStats);
    getAchievements().then(achs =>
      setAchCount({ total: achs.length, unlocked: achs.filter(a => a.unlocked).length })
    );
    getGameHistory().then(h => setRecentGames(h.slice(0, 5)));
  }, []);

  const handleCreate = async () => {
    if (nickname.trim().length < 3) { setError("En az 3 karakter olmalı"); return; }
    if (nickname.trim().length > 15) { setError("En fazla 15 karakter olabilir"); return; }
    setError("");
    const result = await createProfile(nickname.trim());
    if (result) { setProfile(result); } else { setError("Bu isim alınmış, başka bir isim dene"); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={C.brand} />
    </View>
  );

  // ── PROFILE EXISTS — single-view, no scroll ──────────────
  if (profile) {
    const modeLabel = (m: string) =>
      m === "daily" ? "Günlük" : m === "category" ? "Kategori" : "Klasik";

    return (
      <View style={[s.container, {
        paddingTop: insets.top || S.xxxl,
        paddingBottom: insets.bottom + S.md,
      }]}>

        {/* ── AVATAR + NAME ── */}
        <View style={s.topSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {profile.nickname.charAt(0).toLocaleUpperCase("tr-TR")}
            </Text>
          </View>
          <Text style={[T.h2, { color: C.text, marginTop: S.sm }]}>{profile.nickname}</Text>
        </View>

        {/* ── STATS — 4 kutu, tek yatay satır ── */}
        <View style={s.statsRow}>
          {[
            { value: stats.totalGames, label: "Oyun"    },
            { value: stats.bestScore,  label: "En İyi"  },
            { value: stats.avgScore,   label: "Ort."    },
            { value: stats.streak,     label: "Seri 🔥" },
          ].map(st => (
            <View key={st.label} style={s.statBox}>
              <Text style={s.statNum}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── ACHIEVEMENTS ── */}
        <TouchableOpacity
          style={s.achCard}
          onPress={() => navigation.navigate("Achievements")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20 }}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={[T.h3, { color: C.text }]}>Başarımlar</Text>
            <Text style={[T.cap, { color: C.textFaint }]}>{achCount.unlocked}/{achCount.total} açıldı</Text>
          </View>
          <Text style={[T.body, { color: C.textFaint }]}>›</Text>
        </TouchableOpacity>

        {/* ── SON OYUNLAR ── */}
        {recentGames.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Son Oyunlar</Text>
            <View style={s.gameList}>
              {recentGames.map(g => (
                <View key={g.id} style={s.gameRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.gameMode}>
                      {modeLabel(g.mode)}{g.category ? " · " + g.category : ""}
                    </Text>
                    <Text style={s.gameDetail}>{g.correct}/{g.total} doğru</Text>
                  </View>
                  <Text style={[s.gameScore, { color: g.score >= 0 ? C.green : C.red }]}>
                    {g.score}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ACTIONS ── */}
        <View style={s.actions}>
          <Btn label="Liderlik Tablosu" onPress={() => navigation.navigate("Leaderboard")} variant="cta" />
          <BackBtn onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  // ── CREATE PROFILE ────────────────────────────────────────
  return (
    <View style={[s.container, { paddingTop: insets.top || S.xxxl }]}>
      <View style={s.createContent}>
        <Text style={[T.h1, { color: C.text }]}>Profil Oluştur</Text>
        <Text style={[T.bodySm, { color: C.textSoft, marginTop: S.sm, textAlign: "center" }]}>
          Liderlik tablosunda yer almak için bir kullanıcı adı seç
        </Text>
        <TextInput
          style={s.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="Kullanıcı adı..."
          placeholderTextColor={C.textFaint}
          autoCapitalize="none"
          maxLength={15}
        />
        {error ? <Text style={[T.bodySm, { color: C.red, marginTop: S.sm }]}>{error}</Text> : null}
      </View>
      <View style={s.createActions}>
        <Btn label="Kaydet" onPress={handleCreate} variant="cta" />
        <Btn label="Şimdilik Geç" onPress={() => navigation.goBack()} variant="ghost" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: S.page,
    justifyContent: "space-between",
  },

  // Avatar
  topSection: { alignItems: "center", paddingTop: S.lg },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.orange,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "900", color: C.white },

  // Stats — 4 kutu yatay
  statsRow: { flexDirection: "row", gap: S.xs },
  statBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: S.sm + 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 10, fontWeight: "600", color: C.textFaint, marginTop: 1 },

  // Achievements
  achCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: S.md, paddingHorizontal: S.lg,
    gap: S.md,
    borderWidth: 1, borderColor: C.goldBorder,
  },

  // Recent games
  sectionTitle: {
    fontSize: 14, fontWeight: "700", color: C.textSoft,
    marginBottom: S.xs,
    letterSpacing: 0.2,
  },
  gameList: { gap: S.xs },
  gameRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: S.sm, paddingHorizontal: S.md,
    borderWidth: 1, borderColor: C.surfaceLight,
  },
  gameMode: { fontSize: 13, fontWeight: "600", color: C.text },
  gameDetail: { fontSize: 11, color: C.textFaint, marginTop: 1 },
  gameScore: { fontSize: 16, fontWeight: "800" },

  // Actions
  actions: { gap: S.sm },

  // Create profile
  createContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  createActions: { gap: S.md, paddingBottom: S.xl },
  input: {
    width: "100%",
    backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.surfaceLight,
    borderRadius: R.lg,
    padding: S.lg,
    marginTop: S.xl,
    fontSize: 18, fontWeight: "600",
    color: C.text, textAlign: "center",
  },
});
