import React, { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, ScrollView, Share, Platform, Keyboard, ActivityIndicator, KeyboardAvoidingView, Alert } from "react-native";
import { X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Question } from "../types";
import {
  gameReducer, initialGameState, calculateQuestionPoints,
  LETTER_PENALTY, SKIP_PENALTY_RATIO, getBasePoints,
  HINT_DELAY, HINT_DISPLAY,
} from "../utils/gameReducer";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { C, T, S, R, SHADOW, getTileSize } from "../theme/tokens";
import { saveGameRecord, markDailyPlayed, getStats, getDailyStatus } from "../utils/gameHistory";
import { checkAchievements, Achievement } from "../utils/achievements";
import { getLocalProfile, submitScore } from "../utils/supabase";
import { getDailyNumber } from "../utils/questionGenerator";
import { generateGameQuestions } from "../utils/questionGenerator";
import { getSeenWords, markWordsSeen } from "../utils/seenWords";
import { Screen, Btn, Chip, Card, Tile, ProgressDots } from "../components/ui";
import { ScreenProps } from "../types/navigation";

export default function GameScreen({ navigation, route }: ScreenProps<"Game">) {
  const mode = route.params?.mode ?? "classic";
  const category = route.params?.category;
  const insets = useSafeAreaInsets();

  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [answer, setAnswer] = useState("");
  const [profile, setProfile] = useState<{id: string} | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [dailyAlreadyPlayed, setDailyAlreadyPlayed] = useState<{score: number; correct: number; total: number} | null>(null);
  const [scoreDelta, setScoreDelta] = useState<"up" | "down" | null>(null);
  const prevScoreRef = useRef(0);

  useEffect(() => {
    if (mode !== "daily") return;
    getDailyStatus().then(status => {
      if (status && status.dailyNumber === getDailyNumber()) setDailyAlreadyPlayed(status);
    });
  }, [mode]);

  // Kategori modunda kullanıcı zaten seçim yaptı — idle ekranını atla
  useEffect(() => {
    if (mode === "category" && state.status === "idle") startGame();
  }, [mode]);
  const hintSlide = useRef(new Animated.Value(-80)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareResult = async () => {
    const dots = state.questions.map(q => q.correct ? "🟩" : q.skipped ? "⬜" : "🟥").join("");
    const correct = state.questions.filter(q => q.correct).length;
    const daily = mode === "daily" ? " #" + getDailyNumber() : "";
    const text = "HECE" + daily + " " + dots + "\n" + correct + "/" + state.questions.length + " · " + state.totalScore + " puan\nheceoyun.com";
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

  const startGame = async () => {
    try {
      const seen = mode === "daily" ? new Set<string>() : await getSeenWords();
      const questions = generateGameQuestions(mode, category, seen);
      if (questions.length > 0)
        dispatch({ type: "START_GAME", questions, totalTime: mode === "category" ? 90 : 150 });
    } catch (e) { console.error(e); }
  };

  const handleSubmitAnswer = useCallback(() => {
    Keyboard.dismiss();
    dispatch({ type: "SUBMIT_ANSWER", answer });
    setAnswer("");
  }, [answer]);

  const handleExit = useCallback(() => {
    Alert.alert(
      "Oyundan Çıkılsın mı?",
      "Mevcut ilerlemen kaybedilecek ve kalan tüm sorular başarısız sayılacaktır.",
      [
        { text: "Devam Et", style: "cancel" },
        {
          text: "Çık",
          style: "destructive",
          onPress: () => {
            Keyboard.dismiss();
            // Remaining questions (current + future) all treated as skipped → apply penalties
            const remaining = state.questions.slice(state.currentQuestionIndex);
            const skipPenalty = remaining.reduce(
              (sum, q) => sum + Math.round(getBasePoints(q) * SKIP_PENALTY_RATIO), 0
            );
            const finalScore = state.totalScore - skipPenalty;

            const answered = state.questions.slice(0, state.currentQuestionIndex);
            const correct  = answered.filter(q => q.correct).length;
            const skippedAnswered = answered.filter(q => q.skipped).length;
            const wrong    = answered.length - correct - skippedAnswered;

            saveGameRecord({
              mode,
              category,
              score: finalScore,
              correct,
              wrong,
              skipped: skippedAnswered + remaining.length, // remaining all skipped
              total: state.questions.length,
            });

            navigation.popToTop();
          },
        },
      ]
    );
  }, [state, mode, category, navigation]);

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
      if (q?.correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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

  useEffect(() => {
    const delta = state.totalScore - prevScoreRef.current;
    prevScoreRef.current = state.totalScore;
    if (delta === 0) return;
    setScoreDelta(delta > 0 ? "up" : "down");
    const t = setTimeout(() => setScoreDelta(null), 700);
    return () => clearTimeout(t);
  }, [state.totalScore]);

  // Save game when it ends
  useEffect(() => {
    if (state.status !== "gameover") return;

    const correct = state.questions.filter(q => q.correct).length;
    const skipped = state.questions.filter(q => q.skipped).length;
    const wrong = state.questions.length - correct - skipped;
    const totalScore = state.totalScore;
    const totalQuestions = state.questions.length;
    const totalTimeLeft = state.totalTimeLeft;
    const dailyNumber = getDailyNumber();

    if (mode === "daily") {
      markDailyPlayed(dailyNumber, totalScore, correct, totalQuestions);
    } else {
      markWordsSeen(state.questions.map(q => q.wordData.word));
    }

    saveGameRecord({
      mode,
      category,
      score: totalScore,
      correct,
      wrong,
      skipped,
      total: totalQuestions,
    });

    getStats().then(stats =>
      checkAchievements({
        mode,
        category,
        score: totalScore,
        correct,
        total: totalQuestions,
        skipped,
        streak: stats.streak,
        totalCorrect: stats.totalCorrect,
        totalGames: stats.totalGames,
      }).then(newAch => {
        if (newAch.length > 0) setNewAchievements(newAch);
      })
    );

    (async () => {
      const localProfile = await getLocalProfile();
      setProfile(localProfile);
      if (localProfile) {
        await submitScore({
          profileId: localProfile.id,
          mode,
          category,
          score: totalScore,
          correct,
          wrong,
          skipped,
          total: totalQuestions,
          dailyNumber: mode === "daily" ? dailyNumber : undefined,
          durationSeconds: (mode === "category" ? 90 : 150) - totalTimeLeft,
        });
      }
    })();
  }, [state.status, state.questions, state.totalScore, state.totalTimeLeft, mode, category]);

  const cur = state.questions[state.currentQuestionIndex];
  const fmt = (sec: number) => Math.floor(sec / 60) + ":" + (sec % 60).toString().padStart(2, "0");

  // Build progress array for dots
  const correctArr = state.questions.slice(0, state.currentQuestionIndex).map(q => q.correct);

  // ── IDLE ─────────────────────────────────────────────
  if (state.status === "idle") {
    if (mode === "daily" && dailyAlreadyPlayed) {
      return (
        <Screen>
          <Text style={{ fontSize: 48, marginBottom: S.lg }}>✅</Text>
          <Text style={[T.display, { color: C.text }]}>HECE</Text>
          <Text style={[T.h2, { color: C.textSoft, marginTop: S.md }]}>Bugün oynadın!</Text>
          <Text style={[T.bodySm, { color: C.textFaint, marginTop: S.sm }]}>
            {"#" + getDailyNumber() + " · " + dailyAlreadyPlayed.correct + "/" + dailyAlreadyPlayed.total + " doğru · " + dailyAlreadyPlayed.score + " puan"}
          </Text>
          <Text style={[T.cap, { color: C.textFaint, marginTop: S.xs, marginBottom: S.xxxl }]}>Yarın yeni sorular gelecek.</Text>
          <Btn label="← Geri Dön" onPress={() => navigation.goBack()} variant="outline" />
        </Screen>
      );
    }

    if (mode === "category") {
      return (
        <Screen>
          <ActivityIndicator size="large" color={C.brand} />
        </Screen>
      );
    }

    const modeInfo = mode === "daily"
      ? { title: "Günlük Hece", sub: "Bugünün 14 sorusu · 2:30", icon: "📅" }
      : { title: "Klasik Mod", sub: "14 soru · 2:30", icon: "🎯" };
    return (
      <Screen>
        <Text style={{ fontSize: 48, marginBottom: S.lg }}>{modeInfo.icon}</Text>
        <Text style={[T.display, { color: C.text }]}>HECE</Text>
        <Text style={[T.h2, { color: C.textSoft, marginTop: S.md }]}>{modeInfo.title}</Text>
        <Text style={[T.bodySm, { color: C.textFaint, marginTop: S.sm, marginBottom: S.xxxl }]}>{modeInfo.sub}</Text>
        <Btn label="BAŞLA" onPress={startGame} variant="cta" />
        <View style={{ marginTop: S.xl }}>
          <Btn label="← Geri Dön" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
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
        <ScrollView contentContainerStyle={[gs.summaryScroll, { paddingTop: insets.top || S.xxxl }]} showsVerticalScrollIndicator={false}>
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

          <View style={{ height: S.sm }} />

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

          <View style={{ height: S.sm }} />

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
                    <Text style={[T.h3, { color: C.text }]}>{(q.wordData.displayWord ?? q.wordData.word).toLocaleUpperCase("tr-TR")}</Text>
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
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏆</Text>
              <Text style={[T.h2, { color: C.text }]}>Skorunu Kaydet!</Text>
              <Text style={[T.bodySm, { color: C.textSoft, textAlign: "center", marginTop: 4 }]}>Profil oluştur, liderlik tablosunda yerini al</Text>
              <View style={{ backgroundColor: C.orange, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 12 }}>
                <Text style={[T.btn, { color: C.white }]}>Profil Oluştur</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={[gs.endBtns, { marginTop: S.xl }]}>
            {mode !== "daily" && <Btn label="Tekrar Oyna" onPress={startGame} variant="outline" />}
            <Btn label="Ana Sayfa" onPress={() => navigation.popToTop()} variant="ghost" />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── RESULT ───────────────────────────────────────────
  if (state.status === "result" && cur) {
    const ok = cur.correct;
    const skip = cur.skipped;
    const resultCorrectArr = correctArr.concat([ok]);
    const resultSkippedArr = state.questions.slice(0, state.currentQuestionIndex).map(q => q.skipped).concat([skip ?? false]);

    return (
      <SafeAreaView edges={["bottom"]} style={gs.safeBottom}>
      <View style={gs.game}>
        <View style={gs.gameInner}>
          <View style={{ paddingTop: insets.top || S.xxxl }}>
            <View style={gs.exitRow}>
              <TouchableOpacity
                onPress={handleExit}
                style={gs.exitBtn}
                activeOpacity={0.65}
              >
                <X size={15} color={C.textSoft} strokeWidth={2.5} />
                <Text style={gs.exitLabel}>Çık</Text>
              </TouchableOpacity>
            </View>

            <View style={gs.hud}>
              <View style={gs.hudPill}>
                <Text style={[gs.hudValue, { color: C.textFaint }]}>{fmt(state.totalTimeLeft)}</Text>
                <Text style={gs.hudLabel}>SÜRE</Text>
              </View>
              <View style={gs.progressBlock}>
                <ProgressDots
                  current={state.currentQuestionIndex + 1}
                  total={state.questions.length}
                  correct={resultCorrectArr}
                  skipped={resultSkippedArr}
                />
                <Text style={gs.qCounter}>{state.currentQuestionIndex + 1} / {state.questions.length}</Text>
              </View>
              <View style={gs.hudPill}>
                <Text style={[gs.hudValue, { color: C.text }]}>{state.totalScore}</Text>
                <Text style={gs.hudLabel}>PUAN</Text>
              </View>
            </View>
          </View>

          <View style={gs.spacerTop} />

          <View style={gs.midContent}>
            <View style={[gs.resultBox, { backgroundColor: ok ? C.greenSoft : C.redSoft, borderColor: ok ? C.greenBorder : C.redBorder }]}>
              <Text style={{ fontSize: 44, marginBottom: S.md }}>{ok ? "✓" : skip ? "⊘" : "✗"}</Text>
              <Text style={[T.h1, { color: C.text }]}>{(cur.wordData.displayWord ?? cur.wordData.word).toLocaleUpperCase("tr-TR")}</Text>
              <Text style={[T.bodySm, { color: C.textSoft, textAlign: "center", marginTop: S.sm }]}>{cur.wordData.definition}</Text>
              <Text style={[T.h2, { color: ok ? C.green : C.red, marginTop: S.lg }]}>
                {cur.earnedPoints > 0 ? "+" : ""}{cur.earnedPoints}
              </Text>
            </View>
          </View>

          <View style={gs.spacerBottom} />

          <View style={[gs.playZone, { opacity: 0 }]} pointerEvents="none">
            <View style={[gs.ctaBtn, { width: "100%" }]}><Text> </Text></View>
            <View style={gs.secondaryBtns}>
              <View style={gs.secondaryBtn} />
              <View style={gs.secondaryBtn} />
            </View>
          </View>
        </View>
      </View>
      </SafeAreaView>
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
  const tileSize = getTileSize(cur.wordData.length);
  const skippedArr = state.questions.slice(0, state.currentQuestionIndex).map(q => q.skipped);

  return (
    <SafeAreaView edges={["bottom"]} style={gs.safeBottom}>
    <KeyboardAvoidingView
      style={gs.game}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={gs.gameInner}>
      {/* ── HEADER: çık + HUD, her zaman üstte ── */}
      <View style={{ paddingTop: insets.top || S.xxxl }}>
        <View style={gs.exitRow}>
          <TouchableOpacity
            onPress={handleExit}
            style={gs.exitBtn}
            activeOpacity={0.65}
          >
            <X size={15} color={C.textSoft} strokeWidth={2.5} />
            <Text style={gs.exitLabel}>Çık</Text>
          </TouchableOpacity>
        </View>

        <View style={gs.hud}>
          <View style={[gs.hudPill, lowTime && { backgroundColor: tColor + "15", borderColor: tColor + "40" }]}>
            <Text style={[gs.hudValue, { color: tColor }]}>{fmt(state.totalTimeLeft)}</Text>
            <Text style={gs.hudLabel}>SÜRE</Text>
          </View>

          <View style={gs.progressBlock}>
            <ProgressDots
              current={state.currentQuestionIndex}
              total={qTotal}
              correct={correctArr}
              skipped={skippedArr}
            />
            <Text style={gs.qCounter}>{qNum} / {qTotal}</Text>
          </View>

          <View style={[
            gs.hudPill,
            scoreDelta === "up" && { backgroundColor: C.greenSoft, borderColor: C.greenBorder },
            scoreDelta === "down" && { backgroundColor: C.redSoft, borderColor: C.redBorder },
          ]}>
            <Text style={[gs.hudValue, { color: scoreDelta === "up" ? C.green : scoreDelta === "down" ? C.red : C.text }]}>
              {state.totalScore}
            </Text>
            <Text style={gs.hudLabel}>PUAN</Text>
          </View>
        </View>
      </View>

      {state.status !== "answering" && <View style={gs.spacerTop} />}

      {/* ── ORTA: meta + ipucu + tanım + kutucuklar, dikey ortada ── */}
      <View style={gs.midContent}>
        <View style={gs.metaRow}>
          <View style={gs.metaPill}>
            <Text style={[gs.metaValue, { color: C.orange }]}>+{pts}</Text>
            <Text style={gs.metaLabel}>puan</Text>
          </View>
          <View style={gs.metaPill}>
            <Text style={[gs.metaValue, { color: C.brand }]}>{cur.wordData.length}</Text>
            <Text style={gs.metaLabel}>harf</Text>
          </View>
          {cur.wordData.displayWord?.includes(" ") && (
            <View style={[gs.metaPill, { borderColor: C.gold + "80", backgroundColor: C.gold + "18" }]}>
              <Text style={[gs.metaValue, { color: C.gold }]}>2</Text>
              <Text style={gs.metaLabel}>kelime</Text>
            </View>
          )}
        </View>

        {showHint && state.currentFlashHint ? (
          <Animated.View style={[gs.hint, { opacity: hintOpacity }]}>
            <Text style={[T.bodySm, { color: C.gold, textAlign: "center", fontStyle: "italic" }]}>
              {cur.wordData.origin ? cur.wordData.origin + " kökenli — " : "Öz Türkçe — "}
              {state.currentFlashHint}
            </Text>
          </Animated.View>
        ) : null}

        <View style={gs.defBox}>
          <Text
            style={[T.h3, { color: C.text, textAlign: "center" }]}
            numberOfLines={state.status === "answering" ? 3 : 4}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {cur.wordData.definition}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={state.status === "playing" ? 0.7 : 1}
          onPress={() => {
            if (state.status === "playing") {
              setAnswer("");
              dispatch({ type: "PRESS_BUTTON" });
            }
          }}
          style={gs.tiles}
        >
          {cur.wordData.word.split("").map((ch, i) => (
            <Tile key={i} letter={ch} revealed={cur.revealedLetters.includes(i)} size={tileSize} />
          ))}
        </TouchableOpacity>
      </View>

      {state.status !== "answering" && <View style={gs.spacerBottom} />}

      {/* ── BOTTOM ACTIONS ── */}
      {state.status === "answering" ? (
        <View style={gs.answerZone}>
          <View style={gs.answerTimer}>
            <Text style={gs.timerNum}>{state.answerTimeLeft}</Text>
          </View>
          <TextInput
            style={gs.input}
            value={answer}
            onChangeText={setAnswer}
            autoFocus
            autoCapitalize="none"
            placeholder="Cevabınızı yazın..."
            placeholderTextColor={C.textFaint}
            onSubmitEditing={() => { if (answer.trim()) handleSubmitAnswer(); }}
          />
          <TouchableOpacity
            style={[gs.ctaBtn, { width: "100%" }, !answer.trim() && { opacity: 0.45 }]}
            onPress={handleSubmitAnswer}
            disabled={!answer.trim()}
            activeOpacity={0.75}
          >
            <Text style={[T.btn, { color: C.white }]}>CEVAPLA</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={gs.playZone}>
          <TouchableOpacity
            style={[gs.ctaBtn, { width: "100%" }]}
            onPress={() => { setAnswer(""); dispatch({ type: "PRESS_BUTTON" }); }}
            activeOpacity={0.75}
          >
            <Text style={[T.btn, { color: C.white }]}>CEVAPLA</Text>
          </TouchableOpacity>
          <View style={gs.secondaryBtns}>
            <TouchableOpacity
              style={[gs.secondaryBtn, !canHint && { opacity: 0.3 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                dispatch({ type: "REQUEST_LETTER" });
              }}
              disabled={!canHint}
              activeOpacity={0.7}
            >
              <Text style={[T.btnSm, { color: C.textSoft }]}>HARF AL</Text>
              <Text style={gs.penaltyText}>-{LETTER_PENALTY}P</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={gs.secondaryBtn}
              onPress={() => dispatch({ type: "SKIP_QUESTION" })}
              activeOpacity={0.5}
            >
              <Text style={[T.btnSm, { color: C.textSoft }]}>PAS GEÇ</Text>
              <Text style={gs.penaltyText}>-{skipCost}P</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </View>{/* gameInner */}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const gs = StyleSheet.create({
  safeBottom: {
    flex: 1,
    backgroundColor: C.bg,
  },
  game: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: S.page,
    paddingBottom: S.lg,
  },
  gameInner: {
    flex: 1,
  },
  spacerTop: { flex: 1.4 },
  spacerBottom: { flex: 1 },
  topSection: {},
  midContent: {},
  exitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: S.md,
    marginTop: S.xs,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.surfaceLight,
    borderRadius: R.pill,
    paddingVertical: 8,
    paddingHorizontal: S.lg,
  },
  exitLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: C.textSoft,
    letterSpacing: 0.2,
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

  // HUD
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.lg,
  },
  hudPill: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceLight,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    minWidth: 72,
    alignItems: "center",
    gap: 1,
  },
  hudValue: {
    fontSize: 20,
    fontWeight: "800" as const,
    fontVariant: ["tabular-nums" as const],
    letterSpacing: -0.3,
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: C.textFaint,
    letterSpacing: 0.8,
  },
  progressBlock: {
    alignItems: "center",
    gap: 2,
  },
  qCounter: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: C.textFaint,
    letterSpacing: 0.5,
  },

  // Meta
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: S.lg,
    marginBottom: S.lg,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceLight,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.xs + 1,
    gap: S.xs,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "800" as const,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.textFaint,
    letterSpacing: 0.5,
  },

  // Definition
  defBox: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.brandBorder,
  },

  // Tiles
  tilesOuter: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: S.sm,
  },
  tiles: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  // Answer
  answerZone: { alignItems: "center", gap: S.sm },
  answerTimer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.redSoft,
    borderWidth: 2,
    borderColor: C.redBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  timerNum: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: C.red,
    fontVariant: ["tabular-nums" as const],
  },
  input: {
    width: "100%",
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.orange,
    borderRadius: R.lg,
    paddingHorizontal: S.lg,
    paddingTop: S.md + 2,
    paddingBottom: S.lg + 2,   // extra room for descenders (p, y, g, ş, ç)
    fontSize: 18,
    fontWeight: "500" as const,
    // lineHeight intentionally omitted — causes vertical misalignment in iOS TextInput
    color: C.text,
    textAlign: "center",
  },

  // Play
  playZone: { gap: S.sm },
  secondaryBtns: {
    flexDirection: "row",
    gap: S.md,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: S.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.surfaceLight,
  },
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
    backgroundColor: C.orange,
    borderRadius: R.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.soft,
  },
  penaltyText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: C.red,
    opacity: 0.75,
    marginTop: 2,
  },

  // Result
  resultBox: {
    borderRadius: R.xxl,
    padding: S.xxl,
    alignItems: "center",
    marginTop: S.xl,
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
