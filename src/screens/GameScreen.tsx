import React, { useReducer, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Alert, ActivityIndicator } from "react-native";
import { Question } from "../types";
import { gameReducer, initialGameState, FLASH_DURATION, calculateQuestionPoints } from "../utils/gameReducer";
import { COLORS } from "../theme/colors";
import { generateGameQuestions } from "../utils/questionGenerator";

export default function GameScreen({ navigation }: any) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [allWords, setAllWords] = useState<string[]>([]);

  // Kelime listesini başlangıçta bir kez çek
useEffect(() => {
    try {
      const data = require("../data/autocomplete.json");
      const words = data
        .map((d: any) => d.madde || d)
        .filter((w: string) => typeof w === "string" && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w));
      setAllWords(words);
    } catch (err) {
      console.error("Kelime listesi yüklenemedi:", err);
    }
  }, []);

  // Oyunu başlatan asenkron fonksiyon
  const startGame = async () => {
    if (allWordsRef.current.length === 0) {
      Alert.alert("Bekleyin", "Kelimeler henüz yüklenmedi.");
      return;
    }

    setLoading(true);
    try {
      // Parallel fetch ve optimize edilmiş filtreleme ile soruları üret
      const questions = await generateGameQuestions(allWords);
      
      if (questions && questions.length > 0) {
        dispatch({ type: "START_GAME", questions });
      } else {
        Alert.alert("Hata", "Sorular hazırlanırken bir sorun oluştu. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Başlatma hatası:", error);
      Alert.alert("Hata", "Bağlantı sorunu oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Flash (İpucu) Animasyonu
  useEffect(() => {
    if (state.status === "flash") {
      flashOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(FLASH_DURATION - 600),
        Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => { 
        dispatch({ type: "FLASH_DONE" }); 
      });
    }
  }, [state.status, state.currentQuestionIndex]);

  // Toplam Süre Sayacı
  useEffect(() => {
    if (state.status === "playing") {
      totalTimerRef.current = setInterval(() => { dispatch({ type: "TICK_TOTAL" }); }, 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [state.status]);

  // Cevap Verme Süresi Sayacı
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
              <Text style={[styles.letterText, isRevealed && styles.letterTextRevealed]}>
                {isRevealed ? letter.toLocaleUpperCase("tr-TR") : ""}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- EKRAN DURUMLARI ---

  if (state.status === "idle") {
    const isReady = allWords.length > 0;
    return (
      <View style={styles.container}>
        <Text style={styles.gameOverTitle}>Kelime Oyunu</Text>
        <Text style={styles.statsText}>{isReady ? "Hazır!" : "Kelimeler yükleniyor..."}</Text>
        
        {loading ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.statsText, { marginTop: 10 }]}>Sorular TDK'dan çekiliyor...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.replayButton, !isReady && { opacity: 0.5 }]}
            onPress={startGame}
            disabled={!isReady}
          >
            <Text style={styles.replayButtonText}>OYNA</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (state.status === "gameover") {
    const answered = state.questions.filter((q) => q.answered);
    const correct = answered.filter((q) => q.correct);
    return (
      <View style={styles.container}>
        <Text style={styles.gameOverTitle}>Oyun Bitti!</Text>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{state.totalScore}</Text>
          <Text style={styles.scoreLabel}>PUAN</Text>
        </View>
        <Text style={styles.statsText}>{correct.length}/{state.questions.length} Doğru Cevap</Text>
        <View style={styles.endButtons}>
          <TouchableOpacity style={styles.replayButton} onPress={startGame}>
            <Text style={styles.replayButtonText}>Tekrar Oyna</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.homeButtonText}>Ana Sayfa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state.status === "flash") {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.flashContainer, { opacity: flashOpacity }]}>
          <View style={styles.flashBadge}>
            <Text style={styles.flashBadgeText}>İPUCU</Text>
          </View>
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
          <Text style={styles.topScore}>{state.totalScore} P</Text>
        </View>
        <View style={[styles.resultCard, currentQuestion.correct ? styles.resultCorrect : styles.resultWrong]}>
          <Text style={styles.resultIcon}>{currentQuestion.correct ? "✓" : "✗"}</Text>
          <Text style={styles.resultWord}>{currentQuestion.wordData.word.toLocaleUpperCase("tr-TR")}</Text>
          <Text style={styles.resultDef}>{currentQuestion.wordData.definition}</Text>
          <Text style={styles.resultPoints}>
            {currentQuestion.earnedPoints > 0 ? "+" : ""}{currentQuestion.earnedPoints} puan
          </Text>
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
  const timeColor = state.totalTimeLeft < 30 ? COLORS.timerDanger : COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.timerBox}>
          <Text style={[styles.timerText, { color: timeColor }]}>{formatTime(state.totalTimeLeft)}</Text>
        </View>
        <Text style={styles.questionNum}>Soru {questionNumber}/14</Text>
        <Text style={styles.topScore}>{state.totalScore} P</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsBadgeText}>{remainingPoints} Puan</Text>
        </View>
        <Text style={styles.lengthInfo}>{currentQuestion.wordData.length} Harfli</Text>
      </View>

      <View style={styles.definitionBox}>
        <Text style={styles.definitionText}>{currentQuestion.wordData.definition}</Text>
      </View>

      {renderLetterBoxes(currentQuestion)}

      {state.status === "answering" ? (
        <View style={styles.answerSection}>
          <View style={styles.answerTimerCircle}>
            <Text style={styles.answerTimerText}>{state.answerTimeLeft}</Text>
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
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={() => { dispatch({ type: "SUBMIT_ANSWER", answer }); setAnswer(""); }}
          >
            <Text style={styles.submitButtonText}>CEVAPLA</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.hintButton} 
            onPress={() => dispatch({ type: "REQUEST_LETTER" })}
            disabled={currentQuestion.revealedLetters.length >= currentQuestion.wordData.length - 1}
          >
            <Text style={styles.hintButtonText}>HARF AL</Text>
            <Text style={styles.hintCost}>-100P</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.answerButton} 
            onPress={() => { setAnswer(""); dispatch({ type: "PRESS_BUTTON" }); }}
          >
            <Text style={styles.answerButtonText}>CEVAPLA</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain, padding: 20, justifyContent: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 20 },
  timerBox: { backgroundColor: COLORS.bgDark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  timerText: { fontSize: 28, fontWeight: "bold", color: COLORS.primary },
  questionNum: { fontSize: 14, color: COLORS.textMuted },
  topScore: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pointsBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pointsBadgeText: { fontSize: 14, fontWeight: "bold", color: COLORS.white },
  lengthInfo: { fontSize: 14, color: COLORS.textMuted },
  definitionBox: { backgroundColor: COLORS.bgDark, borderRadius: 16, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: COLORS.primaryDark },
  definitionText: { fontSize: 18, color: COLORS.white, lineHeight: 28, textAlign: "center" },
  letterRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 36, flexWrap: "wrap" },
  letterBox: { width: 42, height: 52, backgroundColor: COLORS.letterBox, borderRadius: 10, borderWidth: 2, borderColor: COLORS.letterBoxBorder, justifyContent: "center", alignItems: "center" },
  letterBoxRevealed: { borderColor: COLORS.letterBoxRevealed, backgroundColor: COLORS.bgDark },
  letterText: { fontSize: 24, fontWeight: "bold", color: COLORS.textMuted },
  letterTextRevealed: { color: COLORS.primaryLight },
  actionRow: { flexDirection: "row", gap: 12 },
  hintButton: { flex: 1, backgroundColor: COLORS.bgDark, borderWidth: 1, borderColor: COLORS.primaryDark, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  hintButtonText: { fontSize: 15, fontWeight: "700", color: COLORS.textSecondary },
  hintCost: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  answerButton: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  answerButtonText: { fontSize: 18, fontWeight: "bold", color: COLORS.white, letterSpacing: 1 },
  answerSection: { alignItems: "center", gap: 14 },
  answerTimerCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.wrong, justifyContent: "center", alignItems: "center" },
  answerTimerText: { fontSize: 36, fontWeight: "bold", color: COLORS.white },
  answerInput: { width: "100%", backgroundColor: COLORS.bgDark, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, padding: 16, fontSize: 20, color: COLORS.white, textAlign: "center" },
  submitButton: { width: "100%", backgroundColor: COLORS.buttonSuccess, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  submitButtonText: { fontSize: 18, fontWeight: "bold", color: COLORS.white, letterSpacing: 1 },
  flashContainer: { alignItems: "center", justifyContent: "center", padding: 40 },
  flashBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  flashBadgeText: { fontSize: 13, fontWeight: "bold", color: COLORS.white, letterSpacing: 2 },
  flashText: { fontSize: 28, fontWeight: "bold", color: COLORS.primaryLight, textAlign: "center", lineHeight: 38 },
  resultCard: { alignItems: "center", padding: 32, borderRadius: 20, marginBottom: 24 },
  resultCorrect: { backgroundColor: "#0A2E1A" },
  resultWrong: { backgroundColor: "#2E0A0E" },
  resultIcon: { fontSize: 52, color: COLORS.white, marginBottom: 12 },
  resultWord: { fontSize: 30, fontWeight: "bold", color: COLORS.white, marginBottom: 8 },
  resultDef: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: 12 },
  resultPoints: { fontSize: 20, fontWeight: "600", color: COLORS.textMuted },
  nextButton: { backgroundColor: COLORS.bgDark, paddingVertical: 16, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.primaryDark },
  nextButtonText: { fontSize: 16, fontWeight: "700", color: COLORS.textSecondary },
  gameOverTitle: { fontSize: 32, fontWeight: "bold", color: COLORS.white, textAlign: "center", marginBottom: 24 },
  scoreCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.bgDark, borderWidth: 3, borderColor: COLORS.primary, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 20 },
  scoreNumber: { fontSize: 48, fontWeight: "bold", color: COLORS.primary },
  scoreLabel: { fontSize: 14, color: COLORS.textMuted, letterSpacing: 2 },
  statsText: { fontSize: 18, color: COLORS.textSecondary, textAlign: "center", marginBottom: 36 },
  endButtons: { width: "100%", gap: 12 },
  replayButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  replayButtonText: { fontSize: 18, fontWeight: "bold", color: COLORS.white },
  homeButton: { backgroundColor: COLORS.bgDark, paddingVertical: 16, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.primaryDark },
  homeButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.textSecondary },
});