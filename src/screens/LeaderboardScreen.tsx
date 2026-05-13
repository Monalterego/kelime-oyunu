import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { C, T, S, R } from "../theme/tokens";

import { getLeaderboard, getLocalProfile } from "../utils/supabase";
import { getDailyNumber } from "../utils/questionGenerator";

type Period = "daily" | "weekly" | "monthly" | "alltime";

export default function LeaderboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("daily");
  const tabScrollRef = useRef<ScrollView>(null);
  const tabOffsetsRef = useRef<Record<string, number>>({});
  const [scores, setScores] = useState<any[]>([]);
  const [myNick, setMyNick] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const dailyNumber = getDailyNumber();

  useEffect(() => {
    getLocalProfile().then(p => { if (p) setMyNick(p.nickname); });
  }, []);

  useEffect(() => {
    setLoading(true);
    setHasError(false);
    const modeFilter = period === "daily" ? "daily" : undefined;
    getLeaderboard(period, modeFilter, period === "daily" ? dailyNumber : undefined)
      .then(data => {
        if (period === "daily") {
          const best: Record<string, any> = {};
          (data || []).forEach(item => {
            const nick = item.profiles?.nickname || "Anonim";
            if (!best[nick] || item.score > best[nick].score) best[nick] = item;
          });
          const sorted = Object.values(best).sort((a: any, b: any) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.duration_seconds || 999) - (b.duration_seconds || 999);
          });
          setScores(sorted);
        } else {
          const MIN_GAMES = period === "weekly" ? 3 : period === "monthly" ? 5 : 10;
          const agg: Record<string, any> = {};
          (data || []).forEach(item => {
            const nick = item.profiles?.nickname || "Anonim";
            if (!agg[nick]) agg[nick] = { totalScore: 0, games: 0, totalCorrect: 0, totalTotal: 0, minDuration: 999, nickname: nick };
            agg[nick].totalScore += item.score;
            agg[nick].games += 1;
            agg[nick].totalCorrect += item.correct;
            agg[nick].totalTotal += item.total;
            if (item.duration_seconds && item.duration_seconds < agg[nick].minDuration) agg[nick].minDuration = item.duration_seconds;
          });
          const sorted = Object.values(agg)
            .filter((a: any) => a.games >= MIN_GAMES)
            .map((a: any) => ({ ...a, avgScore: Math.round(a.totalScore / a.games) }))
            .sort((a: any, b: any) => {
              if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
              return a.minDuration - b.minDuration;
            });
          setScores(sorted.map((a: any) => ({
            score: a.avgScore,
            correct: a.totalCorrect,
            total: a.totalTotal,
            profiles: { nickname: a.nickname },
            _games: a.games,
          })));
        }
      })
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, [period, refreshKey]);

  const periods: { key: Period; label: string }[] = [
    { key: "daily", label: "Günlük #" + dailyNumber },
    { key: "weekly", label: "Haftalık" },
    { key: "monthly", label: "Aylık" },
    { key: "alltime", label: "Tüm Zamanlar" },
  ];

  return (
    <View style={[s.container, { paddingTop: (insets.top || S.xxxl) + S.md }]}>
      <Text style={[T.h1, { color: C.text, marginBottom: S.lg }]}>Liderlik Tablosu</Text>

      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabScroll}
        contentContainerStyle={s.tabs}
      >
        {periods.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.tab, period === p.key && s.tabActive]}
            onPress={() => {
              setPeriod(p.key);
              const x = tabOffsetsRef.current[p.key];
              if (x !== undefined) tabScrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
            }}
            onLayout={e => { tabOffsetsRef.current[p.key] = e.nativeEvent.layout.x; }}
            activeOpacity={0.7}
          >
            <Text style={[T.btnSm, { color: period === p.key ? C.white : C.textSoft }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[T.cap, { color: C.textFaint, marginBottom: S.md }]}>
        {period === "daily"
          ? "En yüksek skor · eşitlikte en hızlı"
          : period === "weekly"
          ? "Ortalama skor · en az 3 oyun şartı"
          : period === "monthly"
          ? "Ortalama skor · en az 5 oyun şartı"
          : "Ortalama skor · en az 10 oyun şartı"}
      </Text>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={[T.body, { color: C.textFaint, textAlign: "center", marginTop: S.xl }]}>Yükleniyor...</Text>
        ) : hasError ? (
          <View style={{ alignItems: "center", marginTop: S.xl, gap: S.lg }}>
            <Text style={[T.body, { color: C.textFaint, textAlign: "center" }]}>Bağlantı sorunu oluştu.</Text>
            <TouchableOpacity
              onPress={() => setRefreshKey(k => k + 1)}
              activeOpacity={0.7}
              style={{ backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: S.md, paddingHorizontal: S.xl, borderWidth: 1, borderColor: C.surfaceLight }}
            >
              <Text style={[T.btnSm, { color: C.textSoft }]}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : scores.length === 0 ? (
          <Text style={[T.body, { color: C.textFaint, textAlign: "center", marginTop: S.xl }]}>Henüz skor yok</Text>
        ) : (
          scores.map((item, i) => {
            const nick = item.profiles?.nickname || "Anonim";
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".";
            const isMe = nick === (myNick || "");
            return (
              <View key={i} style={[s.row, i < 3 && s.rowTop, isMe && s.rowMe]}>
                <Text style={s.rank}>{medal}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[T.body, { color: C.text, fontWeight: "600" }]}>{nick}{isMe ? " (sen)" : ""}</Text>
                  <Text style={[T.cap, { color: C.textFaint }]}>
                    {item.correct}/{item.total} doğru{item._games ? " · " + item._games + " oyun" : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[T.h2, { color: i < 3 ? C.gold : C.text }]}>{item.score}</Text>
                  {period !== "daily" && <Text style={[T.cap, { color: C.textFaint }]}>ort.</Text>}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} activeOpacity={0.6}>
        <ArrowLeft size={16} color={C.textSoft} strokeWidth={2} />
        <Text style={[T.btnSm, { color: C.textSoft, marginLeft: 6 }]}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.page, paddingBottom: S.lg },
  tabScroll: { flexGrow: 0, marginBottom: S.sm },
  tabs: { gap: S.sm },
  tab: { paddingVertical: S.md, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.surface, alignItems: "center", borderWidth: 1, borderColor: C.surfaceLight },
  tabActive: { backgroundColor: C.text, borderColor: C.text },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.sm, gap: S.md, borderWidth: 1, borderColor: C.surfaceLight },
  rowTop: { borderColor: C.goldBorder },
  rowMe: { backgroundColor: C.goldSoft, borderColor: C.goldBorder },
  rank: { fontSize: 20, width: 36, textAlign: "center" },
  back: { paddingVertical: S.md, flexDirection: "row", justifyContent: "center", alignItems: "center" },
});
