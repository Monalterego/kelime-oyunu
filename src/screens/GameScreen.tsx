import React, { useReducer, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, ScrollView, Share, Platform } from "react-native";
import { Question } from "../types";
import {
  gameReducer, initialGameState, calculateQuestionPoints,
  LETTER_PENALTY, SKIP_PENALTY_RATIO, getBasePoints,
  HINT_DELAY, HINT_DISPLAY,
} from "../utils/gameReducer";
import { C, T, S, R, SHADOW } from "../theme/tokens";
import { saveGameRecord, markDailyPlayed, getStats } from "../utils/gameHistory";
import { checkAchievements, Achievement } from "../utils/achievements";
import { getLocalProfile, submitScore } from "../utils/supabase";
import { getDailyNumber } from "../utils/questionGenerator";
import { generateGameQuestions } from "../utils/questionGenerator";
import { Screen, Btn, Chip, Card, Tile, ProgressDots } from "../components/ui";

export default function GameScreen({ navigation, route }: any) {
  const mode = route?.params?.mode || "classic";
  const category = route?.params?.category;

  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [answer, setAnswer] = useState("");
  const [profile, setProfile] = useState<{id: string} | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [showHint, setShowHint] = useState(false);
  const hintSlide = useRef(new Animated.Value(-80)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareResult = async () => {
    const dots = state.questions.map(q => q.correct ? "🟩" : q.skipped ? "⬜" : "🟥").join("");
    const correct = state.questions.filter(q => q.correct).length;
    const daily = mode === "daily" ? " #" + getDailyNumber() : "";
    const text = "Dağarcık" + daily + " " + dots + "\n" + correct + "/" + state.questions.length + " · " + state.totalScore + " puan\ndagarcik.app";
    try {
      if (Platform.OS === "web") {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        alert("Sonuç kopyalandı!");
      } else {
        await Share.share({ message: text });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = () => {
    try {
      const questions = generateGameQuestions(mode, category);
      if (questions.length > 0)
        dispatch({ type: "START_GAME", questions, totalTime: mode === "category" ? 90 : 150 });
    } catch (e) { console.error(e); }
  };

  // Hint: slides in from top after delay
  useEffect(() => {
    if (state.status === "playing") {
      setShowHint(false);
      hintSlide.setValue(-80);
      hintOpacity.setValue(0);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => {
        setShowHint(true);
        Animated.parallel([
          Animated.spring(hintSlide, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
          Animated.timing(hintOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(hintSlide, { toValue: -80, duration: 400, useNativeDriver: true }),
            Animated.timing(hintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]).start(() => setShowHint(false));
        }, HINT_DISPLAY);
      }, HINT_DELAY);
    } else {
      setShowHint(false);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    }
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, [state.status, state.currentQuestionIndex]);

  useEffect(() => {
    if (state.status === "playing") {
      totalTimerRef.current = setInterval(() => dispatch({ type: "TICK_TOTAL" }), 1000);
    } else { if (totalTimerRef.current) clearInterval(totalTimerRef.current); }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [state.status]);

  useEffect(() => {
    if (state.status === "result") {
      const q = state.questions[state.currentQuestionIndex];
      const d = q?.correct ? 1500 : 2500;
      const t = setTimeout(() => dispatch({ type: "NEXT_QUESTION" }), d);
      return () => clearTimeout(t);
    }
  }, [state.status, state.currentQuestionIndex]);

  useEffect(() => {
    if (state.status === "answering") {
      answerTimerRef.current = setInterval(() => dispatch({ type: "TICK_ANSWER" }), 1000);
    } else { if (answerTimerRef.current) clearInterval(answerTimerRef.current); }
    return () => { if (answerTimerRef.current) clearInterval(answerTimerRef.current); };
  }, [state.status]);

  // Save game when it ends
  useEffect(() => {
    if (state.status === "gameover") {
      const correct = state.questions.filter(q => q.correct).length;
      const skipped = state.questions.filter(q => q.skipped).length;
      const wrong = state.questions.length - correct - skipped;
      if (mode === "daily") {
        const correct = state.questions.filter(q => q.correct).length;
        markDailyPlayed(getDailyNumber(), state.totalScore, correct, state.questions.length);
      }
      saveGameRecord({
        mode: mode as "classic" | "category" | "daily",
        category: category,
        score: state.totalScore,
        correct,
        wrong,
        skipped,
        total: state.questions.length,
      });
      getStats().then(stats => {
        checkAchievements({
          mode,
          category,
          score: state.totalScore,
          correct,
          total: state.questions.length,
          skipped,
          streak: stats.streak,
          totalCorrect: stats.totalCorrect,
          totalGames: stats.totalGames,
        }).then(newAch => {
          if (newAch.length > 0) setNewAchievements(newAch);
        });
      });
      getLocalProfile().then(setProfile);
      // Cloud save
      getLocalProfile().then(profile => {
        if (profile) {
          submitScore({
            profileId: profile.id,
            mode,
            category,
            score: state.totalScore,
            correct,
            wrong,
            skipped,
            total: state.questions.length,
            dailyNumber: mode === "daily" ? getDailyNumber() : undefined,
          });
        }
      });
    }
  }, [state.status]);

  const cur = state.questions[state.currentQuestionIndex];
  const fmt = (sec: number) => Math.floor(sec / 60) + ":" + (sec % 60).toString().padStart(2, "0");

  // Build progress array for dots
  const correctArr = state.questions.slice(0, state.currentQuestionIndex).map(q => q.correct);

  // ── IDLE ─────────────────────────────────────────────
  if (state.status === "idle") {
    return (
      <Screen>
        <Text style={[T.display, { color: C.text }]}>Dağarcık</Text>
        <Text style={[T.body, { color: C.textSoft, marginTop: S.sm, marginBottom: S.xxl }]}>
          {mode === "category" ? "Kategori Modu" : "Klasik Mod"}
        </Text>
        <Btn label="BAŞLA" onPress={startGame} />
      </Screen>
    );
  }


  // ── GAME OVER ────────────────────────────────────────
  if (state.status === "gameover") {
    const correct = state.questions.filter(q => q.correct);
    const skipped = state.questions.filter(q => q.skipped);
    const wrong = state.questions.filter(q => !q.correct && !q.skipped);
    const pos = state.totalScore >= 0;

    return (
      <View style={gs.summaryScreen}>
        <ScrollView contentContainerStyle={gs.summaryScroll} showsVerticalScrollIndicator={false}>
          <Text style={[T.h2, { color: C.textSoft, marginTop: S.xxl, marginBottom: S.md, textAlign: "center" }]}>Oyun Bitti</Text>

          <View style={[gs.scoreRing, { borderColor: pos ? C.green + "60" : C.red + "60" }]}>
            <Text style={[T.score, { color: pos ? C.gold : C.red }]}>{state.totalScore}</Text>
            <Text style={[T.scoreLabel, { color: C.textFaint }]}>PUAN</Text>
          </View>

          <View style={gs.statsRow}>
            <Chip text={correct.length + " doğru"} color="green" />
            {wrong.length > 0 && <Chip text={wrong.length + " yanlış"} color="red" />}
            {skipped.length > 0 && <Chip text={skipped.length + " pas"} color="purple" />}
          </View>

          <View style={{ marginVertical: S.lg }}>
            <ProgressDots current={state.questions.length} total={state.questions.length} correct={state.questions.map(q => q.correct)} />
          </View>

          <Btn label="Sonucu Paylaş" onPress={shareResult} variant="cta" />

          {newAchievements.length > 0 && (
            <View style={gs.achSection}>
              <Text style={[T.h3, { color: C.gold, marginBottom: S.md }]}>Yeni Başarım!</Text>
              {newAchievements.map(ach => (
                <View key={ach.id} style={gs.achCard}>
                  <Text style={gs.achIcon}>{ach.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.h3, { color: C.text }]}>{ach.title}</Text>
                    <Text style={[T.cap, { color: C.textSoft }]}>{ach.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Btn label={showSummary ? "Özeti Gizle" : "Soru Özetini Gör"} onPress={() => setShowSummary(!showSummary)} variant="outline" />

          {showSummary && state.questions.map((q, i) => {
            const status = q.correct ? "correct" : q.skipped ? "skipped" : "wrong";
            const statusColor = status === "correct" ? C.green : status === "skipped" ? C.purple : C.red;
            const statusBg = status === "correct" ? C.greenSoft : status === "skipped" ? C.purpleSoft : C.redSoft;
            const statusIcon = status === "correct" ? "✓" : status === "skipped" ? "⊘" : "✗";
            const statusLabel = status === "correct" ? "Doğru" : status === "skipped" ? "Pas" : "Yanlış";

            return (
              <View key={i} style={[gs.summaryCard, { borderLeftColor: statusColor }]}>
                <View style={gs.summaryHeader}>
                  <View style={[gs.summaryIconBox, { backgroundColor: statusBg }]}>
                    <Text style={[gs.summaryIcon, { color: statusColor }]}>{statusIcon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.h3, { color: C.text }]}>{q.wordData.word.toLocaleUpperCase("tr-TR")}</Text>
                    <Text style={[T.cap, { color: statusColor, marginTop: 2 }]}>{statusLabel} · {q.earnedPoints > 0 ? "+" : ""}{q.earnedPoints}P</Text>
                  </View>
                </View>
                <Text style={[T.bodySm, { color: C.textSoft, marginTop: S.sm }]}>{q.wordData.definition}</Text>
                {!q.correct && !q.skipped && q.userAnswer ? (
                  <View style={gs.summaryAnswerRow}>
                    <Text style={[T.cap, { color: C.textFaint }]}>Senin cevabın: </Text>
                    <Text style={[T.cap, { color: C.red, textDecorationLine: "line-through" }]}>{q.userAnswer.toLocaleUpperCase("tr-TR")}</Text>
                  </View>
                ) : null}
                {q.skipped ? (
                  <Text style={[T.cap, { color: C.textFaint, marginTop: S.xs, fontStyle: "italic" }]}>Pas geçildi</Text>
                ) : null}
              </View>
            );
          })}

          {!profile && (
            <TouchableOpacity
              style={gs.profilePrompt}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.7}
            >
              <Text style={[T.h3, { color: C.gold }]}>Skorunu kaydet!</Text>
              <Text style={[T.cap, { color: C.textSoft }]}>Profil oluştur, liderlik tablosunda yerini al</Text>
            </TouchableOpacity>
          )}

          <View style={[gs.endBtns, { marginTop: S.xl }]}>
            <Btn label="Tekrar Oyna" onPress={startGame} variant="outline" />
            <Btn label="Ana Sayfa" onPress={() => navigation.navigate("Home")} variant="ghost" />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── RESULT ───────────────────────────────────────────
  if (state.status === "result" && cur) {
    const ok = cur.correct;
    const skip = cur.skipped;
    return (
      <Screen style={{ justifyContent: "flex-start", paddingTop: 56 }}>
        <View style={gs.topBar}>
          <Text style={[T.timer, { color: C.textFaint }]}>{fmt(state.totalTimeLeft)}</Text>
          <Text style={[T.badge, { color: C.textSoft }]}>{state.totalScore} P</Text>
        </View>

        <View style={[gs.resultBox, { backgroundColor: ok ? C.greenSoft : C.redSoft, borderColor: ok ? C.greenBorder : C.redBorder }]}>
          <Text style={{ fontSize: 44, marginBottom: S.md }}>{ok ? "✓" : skip ? "⊘" : "✗"}</Text>
          <Text style={[T.h1, { color: C.text }]}>{cur.wordData.word.toLocaleUpperCase("tr-TR")}</Text>
          <Text style={[T.bodySm, { color: C.textSoft, textAlign: "center", marginTop: S.sm }]}>{cur.wordData.definition}</Text>
          <Text style={[T.h2, { color: ok ? C.green : C.red, marginTop: S.lg }]}>
            {cur.earnedPoints > 0 ? "+" : ""}{cur.earnedPoints}
          </Text>
        </View>

        <ProgressDots current={state.currentQuestionIndex + 1} total={state.questions.length} correct={correctArr.concat([ok])} />
      </Screen>
    );
  }

  // ── PLAYING / ANSWERING ──────────────────────────────
  if (!cur) return null;

  const qNum = state.currentQuestionIndex + 1;
  const qTotal = state.questions.length;
  const pts = calculateQuestionPoints(cur);
  const lowTime = state.totalTimeLeft < 30;
  const critTime = state.totalTimeLeft < 15;
  const tColor = critTime ? C.red : lowTime ? C.gold : C.brand;
  const skipCost = Math.round(getBasePoints(cur) * SKIP_PENALTY_RATIO);
  const canHint = cur.revealedLetters.length < cur.wordData.length - 1;

  return (
    <View style={gs.game}>
      {/* TOP BAR */}
      <View style={gs.topBar}>
        <View style={[gs.timerPill, lowTime && { backgroundColor: tColor + "15" }]}>
          <Text style={[T.timer, { color: tColor }]}>{fmt(state.totalTimeLeft)}</Text>
        </View>
        <ProgressDots current={state.currentQuestionIndex} total={qTotal} correct={correctArr} />
        <Text style={[T.badge, { color: C.text }]}>{state.totalScore} P</Text>
      </View>

      {/* POINTS + LENGTH */}
      <View style={gs.metaRow}>
        <Chip text={pts + " puan"} color="gold" />
        <Text style={[T.cap, { color: C.textFaint }]}>{cur.wordData.length} harfli</Text>
      </View>

      {/* DEFINITION */}
      <View style={gs.defBox}>
        <Text style={[T.game, { color: C.text, textAlign: "center" }]}>{cur.wordData.definition}</Text>
      </View>

      {/* Hint banner */}
      {showHint && state.currentFlashHint ? (
        <Animated.View style={[gs.hint, { opacity: hintOpacity }]}>
          <Text style={[T.body, { color: C.gold, textAlign: "center", fontStyle: "italic" }]}>
            {cur.wordData.origin ? cur.wordData.origin + " kökenli — " : "Öz Türkçe — "}
            {state.currentFlashHint}
          </Text>
        </Animated.View>
      ) : null}

      {/* TILES */}
      <View style={gs.tiles}>
        {cur.wordData.word.split("").map((ch, i) => (
          <Tile key={i} letter={ch} revealed={cur.revealedLetters.includes(i)} />
        ))}
      </View>

      {/* ACTIONS */}
      {state.status === "answering" ? (
        <View style={gs.answerZone}>
          <View style={gs.answerTimer}>
            <Text style={[T.timerBig, { color: C.red }]}>{state.answerTimeLeft}</Text>
          </View>
          <TextInput
            style={gs.input}
            value={answer}
            onChangeText={setAnswer}
            autoFocus
            autoCapitalize="none"
            placeholder="Cevabınızı yazın..."
            placeholderTextColor={C.textFaint}
            onSubmitEditing={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }}
          />
          <Btn label="CEVAPLA" onPress={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }} variant="primary" />
        </View>
      ) : (
        <View style={gs.playZone}>
          <View style={gs.mainBtns}>
            <TouchableOpacity
              style={[gs.hintBtn, !canHint && { opacity: 0.3 }]}
              onPress={() => dispatch({ type: "REQUEST_LETTER" })}
              disabled={!canHint}
              activeOpacity={0.7}
            >
              <Text style={[T.btnSm, { color: C.textSoft }]}>HARF AL</Text>
              <Text style={[T.cap, { color: C.textFaint }]}>-{LETTER_PENALTY}P</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={gs.ctaBtn}
              onPress={() => { setAnswer(""); dispatch({ type: "PRESS_BUTTON" }); }}
              activeOpacity={0.75}
            >
              <Text style={[T.btn, { color: C.white }]}>CEVAPLA</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={gs.skipBtn} onPress={() => dispatch({ type: "SKIP_QUESTION" })} activeOpacity={0.5}>
            <Text style={[T.cap, { color: C.textFaint }]}>PAS GEÇ (-{skipCost}P)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const gs = StyleSheet.create({
  game: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: S.page,
    paddingTop: 52,
    paddingBottom: S.xl,
    justifyContent: "space-between",
  },

  // Hint
  hint: {
    backgroundColor: C.goldSoft,
    borderRadius: R.lg,
    paddingVertical: S.lg,
    paddingHorizontal: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.lg,
  },
  timerPill: {
    backgroundColor: C.surface,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.md,
  },

  // Meta
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.md,
  },

  // Definition
  defBox: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: S.xl,
    paddingHorizontal: S.lg,
    marginBottom: S.xl,
    borderWidth: 1,
    borderColor: C.brandBorder,
  },

  // Tiles
  tiles: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: S.xl,
    flexWrap: "wrap",
  },

  // Answer
  answerZone: { alignItems: "center", gap: S.md },
  answerTimer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.redSoft,
    borderWidth: 2,
    borderColor: C.redBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.brand,
    borderRadius: R.lg,
    padding: S.lg,
    ...T.game,
    color: C.text,
    textAlign: "center",
  },

  // Play
  playZone: { gap: S.md },
  mainBtns: { flexDirection: "row", gap: S.md },
  hintBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: S.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  ctaBtn: {
    flex: 1.6,
    backgroundColor: C.orange,
    borderRadius: R.lg,
    paddingVertical: S.lg,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.soft,
  },
  skipBtn: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceLight,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    alignItems: "center",
    alignSelf: "center",
  },

  // Result
  resultBox: {
    borderRadius: R.xxl,
    padding: S.xxl,
    alignItems: "center",
    marginVertical: S.xxl,
    borderWidth: 1,
  },

  // Score
  scoreRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: S.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: S.sm,
    justifyContent: "center",
    marginBottom: S.xl,
  },
  endBtns: {
    width: "100%",
    gap: S.md,
    marginTop: S.xxl,
  },

  // Achievements
  achSection: {
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  achCard: {
    flexDirection: "row",
    backgroundColor: C.goldSoft,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.sm,
    gap: S.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  achIcon: {
    fontSize: 28,
  },

  // Summary
  summaryScreen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  summaryScroll: {
    paddingHorizontal: S.page,
    paddingBottom: S.xxxl,
  },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryIcon: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryAnswerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: S.sm,
    flexWrap: "wrap",
  },
});
