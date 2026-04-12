import React, { useReducer, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Question } from "../types";
import {
  gameReducer,
  initialGameState,
  calculateQuestionPoints,
  LETTER_PENALTY,
  SKIP_PENALTY_RATIO,
  getBasePoints,
  HINT_DELAY,
  HINT_DISPLAY,
} from "../utils/gameReducer";
import { COLORS, TYPO, SP, RADIUS, SHADOW } from "../theme/tokens";
import { generateGameQuestions } from "../utils/questionGenerator";
import { ScreenContainer, AppButton, AppCard, Badge, LetterTile } from "../components/ui";

export default function GameScreen({ navigation, route }: any) {
  const mode = route?.params?.mode || "classic";
  const category = route?.params?.category;

  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = () => {
    try {
      const questions = generateGameQuestions(mode, category);
      if (questions.length > 0)
        dispatch({ type: "START_GAME", questions, totalTime: mode === "category" ? 90 : 150 });
    } catch (error) {
      console.error("Oyun baslatma hatasi:", error);
    }
  };

  // Delayed hint
  useEffect(() => {
    if (state.status === "playing") {
      setShowHint(false);
      hintOpacity.setValue(0);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => {
        setShowHint(true);
        Animated.sequence([
          Animated.timing(hintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(HINT_DISPLAY),
          Animated.timing(hintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setShowHint(false));
      }, HINT_DELAY);
    } else {
      setShowHint(false);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    }
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, [state.status, state.currentQuestionIndex]);

  // Total timer
  useEffect(() => {
    if (state.status === "playing") {
      totalTimerRef.current = setInterval(() => dispatch({ type: "TICK_TOTAL" }), 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [state.status]);

  // Auto-advance from result
  useEffect(() => {
    if (state.status === "result") {
      const q = state.questions[state.currentQuestionIndex];
      const delay = q?.correct ? 1500 : 2500;
      const timer = setTimeout(() => dispatch({ type: "NEXT_QUESTION" }), delay);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.currentQuestionIndex]);

  // Answer timer
  useEffect(() => {
    if (state.status === "answering") {
      answerTimerRef.current = setInterval(() => dispatch({ type: "TICK_ANSWER" }), 1000);
    } else {
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    }
    return () => { if (answerTimerRef.current) clearInterval(answerTimerRef.current); };
  }, [state.status]);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + s.toString().padStart(2, "0");
  };

  // ── IDLE ──────────────────────────────────────────────
  if (state.status === "idle") {
    return (
      <ScreenContainer>
        <Text style={[TYPO.hero, { color: COLORS.textBright }]}>Dağarcık</Text>
        <Text style={[TYPO.body, { color: COLORS.textSecondary, marginTop: SP.sm, marginBottom: SP["3xl"] }]}>
          {mode === "category" ? "Kategori Modu" : "Klasik Mod"}
        </Text>
        <AppButton title="OYNA" onPress={startGame} size="lg" />
      </ScreenContainer>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────
  if (state.status === "gameover") {
    const answered = state.questions.filter((q) => q.answered);
    const correct = answered.filter((q) => q.correct);
    const skipped = answered.filter((q) => q.skipped);
    const isPositive = state.totalScore >= 0;

    return (
      <ScreenContainer>
        <Text style={[TYPO.title, { color: COLORS.textBright, marginBottom: SP["2xl"] }]}>
          Oyun Bitti!
        </Text>

        {/* Score circle */}
        <View style={[styles.scoreRing, isPositive ? styles.scoreRingPositive : styles.scoreRingNegative]}>
          <Text style={[TYPO.score, { color: isPositive ? COLORS.correct : COLORS.wrong }]}>
            {state.totalScore}
          </Text>
          <Text style={[TYPO.label, { color: COLORS.textMuted }]}>PUAN</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Badge text={correct.length + "/" + state.questions.length + " doğru"} variant={correct.length > state.questions.length / 2 ? "correct" : "wrong"} />
          {skipped.length > 0 && <Badge text={skipped.length + " pas"} variant="skip" />}
        </View>

        {/* Actions */}
        <View style={styles.endActions}>
          <AppButton title="Tekrar Oyna" onPress={startGame} />
          <AppButton title="Ana Sayfa" onPress={() => navigation.navigate("Home")} variant="ghost" />
        </View>
      </ScreenContainer>
    );
  }

  // ── RESULT ────────────────────────────────────────────
  if (state.status === "result" && currentQuestion) {
    const isCorrect = currentQuestion.correct;
    const isSkipped = currentQuestion.skipped;

    return (
      <ScreenContainer>
        {/* Timer still visible */}
        <View style={styles.topBar}>
          <Text style={[TYPO.timer, { color: COLORS.textMuted }]}>{formatTime(state.totalTimeLeft)}</Text>
          <Text style={[TYPO.points, { color: COLORS.textSecondary }]}>{state.totalScore} P</Text>
        </View>

        {/* Result card */}
        <AppCard style={[
          styles.resultCardWrapper,
          { backgroundColor: isCorrect ? COLORS.correctBg : COLORS.wrongBg },
          { borderWidth: 1, borderColor: isCorrect ? COLORS.correct + "30" : COLORS.wrong + "30" },
        ]}>
          <Text style={styles.resultIcon}>
            {isCorrect ? "✓" : isSkipped ? "⊘" : "✗"}
          </Text>
          <Text style={[TYPO.title, { color: COLORS.textBright, marginBottom: SP.sm }]}>
            {currentQuestion.wordData.word.toLocaleUpperCase("tr-TR")}
          </Text>
          <Text style={[TYPO.bodySm, { color: COLORS.textSecondary, textAlign: "center", marginBottom: SP.md }]}>
            {currentQuestion.wordData.definition}
          </Text>
          <Text style={[TYPO.subtitle, { color: isCorrect ? COLORS.correct : COLORS.wrong }]}>
            {currentQuestion.earnedPoints > 0 ? "+" : ""}{currentQuestion.earnedPoints} puan
          </Text>
        </AppCard>

        <AppButton
          title="Sonraki Soru"
          onPress={() => dispatch({ type: "NEXT_QUESTION" })}
          variant="secondary"
        />
      </ScreenContainer>
    );
  }

  // ── PLAYING / ANSWERING ───────────────────────────────
  if (!currentQuestion) return null;

  const questionNumber = state.currentQuestionIndex + 1;
  const totalQuestions = state.questions.length;
  const remainingPoints = calculateQuestionPoints(currentQuestion);
  const isTimeLow = state.totalTimeLeft < 30;
  const isTimeCritical = state.totalTimeLeft < 15;
  const timeColor = isTimeCritical ? COLORS.wrong : isTimeLow ? COLORS.timerWarning : COLORS.primary;
  const skipPenalty = Math.round(getBasePoints(currentQuestion) * SKIP_PENALTY_RATIO);
  const canTakeLetter = currentQuestion.revealedLetters.length < currentQuestion.wordData.length - 1;

  return (
    <View style={styles.gameContainer}>
      {/* Hint banner */}
      {showHint && state.currentFlashHint ? (
        <Animated.View style={[styles.hintBanner, { opacity: hintOpacity }]}>
          <Text style={styles.hintText}>
            {currentQuestion.wordData.origin
              ? currentQuestion.wordData.origin + " kökenli — "
              : "Öz Türkçe — "}
            {state.currentFlashHint}
          </Text>
        </Animated.View>
      ) : null}

      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View style={[styles.timerPill, isTimeLow && { backgroundColor: timeColor + "20" }]}>
          <Text style={[TYPO.timer, { color: timeColor }]}>{formatTime(state.totalTimeLeft)}</Text>
        </View>
        <Text style={[TYPO.caption, { color: COLORS.textMuted }]}>
          {questionNumber}/{totalQuestions}
        </Text>
        <Text style={[TYPO.points, { color: COLORS.textPrimary }]}>{state.totalScore} P</Text>
      </View>

      {/* ── INFO ROW ── */}
      <View style={styles.infoRow}>
        <Badge text={remainingPoints + " puan"} variant="accent" />
        <Text style={[TYPO.caption, { color: COLORS.textMuted }]}>
          {currentQuestion.wordData.length} harfli
        </Text>
      </View>

      {/* ── DEFINITION CARD ── */}
      <AppCard variant="outlined" style={styles.defCard}>
        <Text style={[TYPO.bodyLg, { color: COLORS.textPrimary, textAlign: "center" }]}>
          {currentQuestion.wordData.definition}
        </Text>
      </AppCard>

      {/* ── LETTER TILES ── */}
      <View style={styles.letterRow}>
        {currentQuestion.wordData.word.split("").map((letter, i) => (
          <LetterTile
            key={i}
            letter={letter}
            revealed={currentQuestion.revealedLetters.includes(i)}
          />
        ))}
      </View>

      {/* ── ACTION AREA ── */}
      {state.status === "answering" ? (
        <View style={styles.answerArea}>
          <View style={[styles.answerTimerCircle, { backgroundColor: COLORS.wrongBg, borderColor: COLORS.wrong + "40" }]}>
            <Text style={[TYPO.timer, { color: COLORS.wrong }]}>{state.answerTimeLeft}</Text>
          </View>
          <TextInput
            style={styles.answerInput}
            value={answer}
            onChangeText={setAnswer}
            autoFocus
            autoCapitalize="none"
            placeholder="Cevabınızı yazın..."
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }}
          />
          <AppButton
            title="CEVAPLA"
            onPress={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }}
            variant="primary"
          />
        </View>
      ) : (
        <View style={styles.playActions}>
          <View style={styles.mainButtons}>
            <TouchableOpacity
              style={[styles.hintBtn, !canTakeLetter && { opacity: 0.35 }]}
              onPress={() => dispatch({ type: "REQUEST_LETTER" })}
              disabled={!canTakeLetter}
              activeOpacity={0.7}
            >
              <Text style={[TYPO.buttonSm, { color: COLORS.textSecondary }]}>HARF AL</Text>
              <Text style={[TYPO.caption, { color: COLORS.textMuted }]}>-{LETTER_PENALTY}P</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.answerBtn}
              onPress={() => { setAnswer(""); dispatch({ type: "PRESS_BUTTON" }); }}
              activeOpacity={0.7}
            >
              <Text style={[TYPO.button, { color: COLORS.textOnPrimary }]}>CEVAPLA</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => dispatch({ type: "SKIP_QUESTION" })}
            activeOpacity={0.6}
          >
            <Text style={[TYPO.caption, { color: COLORS.textMuted }]}>
              PAS GEÇ (-{skipPenalty}P)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
    paddingHorizontal: SP.screen,
    paddingTop: 50,
    paddingBottom: SP["2xl"],
    justifyContent: "space-between",
  },

  // Hint
  hintBanner: {
    position: "absolute",
    top: 44,
    left: SP.screen,
    right: SP.screen,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    paddingVertical: SP.md,
    paddingHorizontal: SP.lg,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    ...SHADOW.md,
  },
  hintText: {
    ...TYPO.bodySm,
    color: COLORS.primary,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP.lg,
  },
  timerPill: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
    borderRadius: RADIUS.md,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP.lg,
  },

  // Definition
  defCard: {
    marginBottom: SP["2xl"],
    paddingVertical: SP["2xl"],
  },

  // Letters
  letterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SP.sm,
    marginBottom: SP["2xl"],
    flexWrap: "wrap",
  },

  // Answer area
  answerArea: {
    alignItems: "center",
    gap: SP.md,
  },
  answerTimerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  answerInput: {
    width: "100%",
    backgroundColor: COLORS.bgInput,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SP.lg,
    ...TYPO.bodyLg,
    color: COLORS.textBright,
    textAlign: "center",
  },

  // Play actions
  playActions: {
    gap: SP.md,
  },
  mainButtons: {
    flexDirection: "row",
    gap: SP.md,
  },
  hintBtn: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    paddingVertical: SP.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  answerBtn: {
    flex: 1.5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SP.lg,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.glow(COLORS.primary),
  },
  skipBtn: {
    paddingVertical: SP.md,
    alignItems: "center",
  },

  // Result
  resultCardWrapper: {
    alignItems: "center",
    marginBottom: SP["2xl"],
    paddingVertical: SP["3xl"],
  },
  resultIcon: {
    fontSize: 48,
    color: COLORS.textBright,
    marginBottom: SP.md,
  },

  // Score
  scoreRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    backgroundColor: COLORS.bgCard,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: SP["2xl"],
  },
  scoreRingPositive: {
    borderColor: COLORS.correct + "50",
  },
  scoreRingNegative: {
    borderColor: COLORS.wrong + "50",
  },
  statsRow: {
    flexDirection: "row",
    gap: SP.sm,
    justifyContent: "center",
    marginBottom: SP["3xl"],
  },
  endActions: {
    width: "100%",
    gap: SP.md,
  },
});