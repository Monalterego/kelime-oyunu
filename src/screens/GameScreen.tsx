import React, { useReducer, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { GameState, Question } from "../types";
import { gameReducer, initialGameState, FLASH_DURATION, calculateQuestionPoints } from "../utils/gameReducer";
import { SAMPLE_QUESTIONS } from "../data/sampleGame";

export default function GameScreen() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [answer, setAnswer] = useState("");
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    dispatch({ type: "START_GAME", questions: SAMPLE_QUESTIONS });
  };

  useEffect(() => {
    if (state.status === "flash") {
      flashOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(FLASH_DURATION - 600),
        Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => { dispatch({ type: "FLASH_DONE" }); });
    }
  }, [state.status, state.currentQuestionIndex]);

  useEffect(() => {
    if (state.status === "playing") {
      totalTimerRef.current = setInterval(() => { dispatch({ type: "TICK_TOTAL" }); }, 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [state.status]);

  useEffect(() => {
    if (state.status === "answering") {
      answerTimerRef.current = setInterval(() => { dispatch({ type: "TICK_ANSWER" }); }, 1000);
    } else {
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    }
    return () => { if (answerTimerRef.current) clearInterval(answerTimerRef.current); };
  }, [state.status]);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  const renderLetterBoxes = (question: Question) => {
    const word = question.wordData.word;
    return (
      <View style={styles.letterRow}>
        {word.split("").map((letter, i) => {
          const isRevealed = question.revealedLetters.includes(i);
          return (
            <View key={i} style={[styles.letterBox, isRevealed && styles.letterBoxRevealed]}>
              <Text style={styles.letterText}>{isRevealed ? letter.toLocaleUpperCase("tr-TR") : ""}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + s.toString().padStart(2, "0");
  };

  if (state.status === "idle") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Kelime Oyunu</Text>
        <Text style={styles.subtitle}>4 dakikada 14 soru</Text>
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>Oyunu Baslat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.status === "gameover") {
    const answered = state.questions.filter((q) => q.answered);
    const correct = answered.filter((q) => q.correct);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Oyun Bitti!</Text>
        <Text style={styles.scoreText}>{state.totalScore} Puan</Text>
        <Text style={styles.statsText}>{correct.length}/{answered.length} Dogru</Text>
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>Tekrar Oyna</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.status === "flash") {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.flashContainer, { opacity: flashOpacity }]}>
          <Text style={styles.flashText}>{state.currentFlashHint}</Text>
        </Animated.View>
      </View>
    );
  }

  if (state.status === "result" && currentQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.timerText}>{formatTime(state.totalTimeLeft)}</Text>
          <Text style={styles.scoreLabel}>{state.totalScore} P</Text>
        </View>
        <View style={[styles.resultCard, currentQuestion.correct ? styles.resultCorrect : styles.resultWrong]}>
          <Text style={styles.resultEmoji}>{currentQuestion.correct ? "\u2713" : "\u2717"}</Text>
          <Text style={styles.resultWord}>{currentQuestion.wordData.word.toLocaleUpperCase("tr-TR")}</Text>
          <Text style={styles.resultPoints}>{currentQuestion.earnedPoints > 0 ? "+" : ""}{currentQuestion.earnedPoints} puan</Text>
        </View>
        <TouchableOpacity style={styles.nextButton} onPress={() => dispatch({ type: "NEXT_QUESTION" })}>
          <Text style={styles.nextButtonText}>Sonraki Soru</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentQuestion) return null;
  const questionNumber = state.currentQuestionIndex + 1;
  const remainingPoints = calculateQuestionPoints(currentQuestion);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.timerText}>{formatTime(state.totalTimeLeft)}</Text>
        <Text style={styles.questionNumber}>Soru {questionNumber}/14</Text>
        <Text style={styles.scoreLabel}>{state.totalScore} P</Text>
      </View>
      <View style={styles.questionInfo}>
        <Text style={styles.pointsText}>{remainingPoints} Puan</Text>
        <Text style={styles.lengthText}>{currentQuestion.wordData.length} Harf</Text>
      </View>
      <View style={styles.definitionBox}>
        <Text style={styles.definitionText}>{currentQuestion.wordData.definition}</Text>
      </View>
      {renderLetterBoxes(currentQuestion)}
      {state.status === "answering" ? (
        <View style={styles.answerSection}>
          <Text style={styles.answerTimer}>{state.answerTimeLeft}s</Text>
          <TextInput style={styles.answerInput} value={answer} onChangeText={setAnswer} autoFocus autoCapitalize="none" placeholder="Cevabinizi yazin..." onSubmitEditing={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }} />
          <TouchableOpacity style={styles.submitButton} onPress={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }}>
            <Text style={styles.submitButtonText}>Cevapla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.letterButton} onPress={() => dispatch({ type: "REQUEST_LETTER" })}>
            <Text style={styles.letterButtonText}>Harf Al (-100P)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buzzButton} onPress={() => { setAnswer(""); dispatch({ type: "PRESS_BUTTON" }); }}>
            <Text style={styles.buzzButtonText}>BIL!</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 20, justifyContent: "center" },
  title: { fontSize: 36, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#888", textAlign: "center", marginTop: 8, marginBottom: 32 },
  startButton: { backgroundColor: "#f59e0b", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginHorizontal: 40 },
  startButtonText: { fontSize: 20, fontWeight: "bold", color: "#000" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  timerText: { fontSize: 28, fontWeight: "bold", color: "#f59e0b" },
  questionNumber: { fontSize: 14, color: "#888" },
  scoreLabel: { fontSize: 18, fontWeight: "600", color: "#fff" },
  questionInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  pointsText: { fontSize: 16, color: "#f59e0b", fontWeight: "600" },
  lengthText: { fontSize: 14, color: "#666" },
  definitionBox: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 24 },
  definitionText: { fontSize: 18, color: "#e5e5e5", lineHeight: 26, textAlign: "center" },
  letterRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 32, flexWrap: "wrap" },
  letterBox: { width: 40, height: 48, backgroundColor: "#1a1a1a", borderRadius: 8, borderWidth: 2, borderColor: "#333", justifyContent: "center", alignItems: "center" },
  letterBoxRevealed: { borderColor: "#f59e0b", backgroundColor: "#1c1500" },
  letterText: { fontSize: 22, fontWeight: "bold", color: "#f59e0b" },
  actionButtons: { flexDirection: "row", gap: 12 },
  letterButton: { flex: 1, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  letterButtonText: { fontSize: 16, color: "#888", fontWeight: "600" },
  buzzButton: { flex: 1, backgroundColor: "#f59e0b", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  buzzButtonText: { fontSize: 20, fontWeight: "bold", color: "#000" },
  answerSection: { alignItems: "center", gap: 12 },
  answerTimer: { fontSize: 48, fontWeight: "bold", color: "#ef4444" },
  answerInput: { width: "100%", backgroundColor: "#1a1a1a", borderWidth: 2, borderColor: "#f59e0b", borderRadius: 12, padding: 16, fontSize: 20, color: "#fff", textAlign: "center" },
  submitButton: { width: "100%", backgroundColor: "#22c55e", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitButtonText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  flashContainer: { alignItems: "center", justifyContent: "center", padding: 40 },
  flashText: { fontSize: 28, fontWeight: "bold", color: "#f59e0b", textAlign: "center" },
  resultCard: { alignItems: "center", padding: 32, borderRadius: 16, marginBottom: 24 },
  resultCorrect: { backgroundColor: "#052e16" },
  resultWrong: { backgroundColor: "#2c0b0e" },
  resultEmoji: { fontSize: 48, marginBottom: 12, color: "#fff" },
  resultWord: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  resultPoints: { fontSize: 20, color: "#888" },
  nextButton: { backgroundColor: "#333", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  nextButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  scoreText: { fontSize: 48, fontWeight: "bold", color: "#f59e0b", textAlign: "center", marginVertical: 16 },
  statsText: { fontSize: 18, color: "#888", textAlign: "center", marginBottom: 32 },
});
