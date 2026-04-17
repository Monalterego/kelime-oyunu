import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { C, T, S, R } from "../theme/tokens";
import { getLeaderboard, getLocalProfile } from "../utils/supabase";
import { getDailyNumber } from "../utils/questionGenerator";

type Period = "daily" | "weekly" | "monthly" | "alltime";

export default function LeaderboardScreen({ navigation }: any) {
  const [period, setPeriod] = useState<Period>("daily");
  const [scores, setScores] = useState<any[]>([]);
  const [myNick, setMyNick] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dailyNumber = getDailyNumber();

  useEffect(() => {
    getLocalProfile().then(p => { if (p) setMyNick(p.nickname); });
  }, []);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(period, undefined, period === "daily" ? dailyNumber : undefined).then(data => {
      setScores(data);
      setLoading(false);
    });
  }, [period]);

  const periods: { key: Period; label: string }[] = [
    { key: "daily", label: "Gunluk #" + dailyNumber },
    { key: "weekly", label: "Haftalik" },
    { key: "monthly", label: "Aylik" },
    { key: "alltime", label: "Tum Zamanlar" },
  ];

  return (
    <View style={s.container}>
      <Text style={[T.h1, { color: C.text, marginBottom: S.lg }]}>Liderlik Tablosu</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabs}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.tab, period === p.key && s.tabActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.7}
          >
            <Text style={[T.btnSm, { color: period === p.key ? C.white : C.textSoft }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={[T.body, { color: C.textFaint, textAlign: "center", marginTop: S.xl }]}>Yukleniyor...</Text>
        ) : scores.length === 0 ? (
          <Text style={[T.body, { color: C.textFaint, textAlign: "center", marginTop: S.xl }]}>Henuz skor yok</Text>
        ) : (
          scores.map((item, i) => {
            const nick = item.profiles?.nickname || "Anonim";
            const medal = i === 0 ? "\ud83e\udd47" : i === 1 ? "\ud83e\udd48" : i === 2 ? "\ud83e\udd49" : (i + 1) + ".";
            const isMe = nick === (myNick || "");
            return (
              <View key={i} style={[s.row, i < 3 && s.rowTop, isMe && s.rowMe]}>
                <Text style={s.rank}>{medal}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[T.body, { color: C.text, fontWeight: "600" }]}>{nick}{isMe ? " (sen)" : ""}</Text>
                  <Text style={[T.cap, { color: C.textFaint }]}>{item.correct}/{item.total} dogru</Text>
                </View>
                <Text style={[T.h2, { color: i < 3 ? C.gold : C.text }]}>{item.score}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} activeOpacity={0.6}>
        <Text style={[T.btnSm, { color: C.textSoft }]}>Geri Don</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.page, paddingTop: 56, paddingBottom: S.lg },
  tabScroll: { flexGrow: 0, marginBottom: S.xl },
  tabs: { gap: S.sm },
  tab: { paddingVertical: S.md, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.surface, alignItems: "center", borderWidth: 1, borderColor: C.surfaceLight },
  tabActive: { backgroundColor: C.text, borderColor: C.text },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.sm, gap: S.md, borderWidth: 1, borderColor: C.surfaceLight },
  rowTop: { borderColor: C.goldBorder },
  rowMe: { backgroundColor: C.goldSoft, borderColor: C.goldBorder },
  rank: { fontSize: 20, width: 36, textAlign: "center" },
  back: { paddingVertical: S.md, alignItems: "center" },
});
