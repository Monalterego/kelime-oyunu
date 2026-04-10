import React, { useEffect, useReducer, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Question } from "../types";
import {
  gameReducer,
  initialGameState,
  calculateQuestionPoints,
  getComboMultiplier,
  getBasePoints,
  getHintPenalty,
} from "../utils/gameReducer";
import { COLORS } from "../theme/colors";
import { generateGameQuestions } from "../utils/questionGenerator";

export default function GameScreen({ navigation }: any) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [allWords, setAllWords] = useState<string[]>([]);

  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const data = require("../data/autocomplete.json");
      const words = data
        .map((d: any) => d.madde || d)
        .filter(
          (w: string) =>
            typeof w === "string" && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w)
        );

      setAllWords(words);
    } catch (err) {
      console.error("Kelime listesi yüklenemedi:", err);
    }
  }, []);

  const startGame = async () => {
    if (allWords.length === 0) {
      Alert.alert("Bekleyin", "Kelimeler henüz yüklenmedi.");
      return;
    }

    setLoading(true);

    try {
      const questions = await generateGameQuestions(allWords);

      if (questions && questions.length > 0) {
        dispatch({ type: "START_GAME", questions });
      } else {
        Alert.alert(
          "Hata",
          "Sorular hazırlanırken bir sorun oluştu. Lütfen tekrar deneyin."
        );
      }
    } catch (error) {
      console.error("Başlatma hatası:", error);
      Alert.alert("Hata", "Sorular hazırlanırken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.status === "playing") {
      totalTimerRef.current = setInterval(() => {
        dispatch({ type: "TICK_TOTAL" });
      }, 1000);
    } else if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }

    return () => {
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
      }
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status === "answering") {
      answerTimerRef.current = setInterval(() => {
        dispatch({ type: "TICK_ANSWER" });
      }, 1000);
    } else if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }

    return () => {
      if (answerTimerRef.current) {
        clearInterval(answerTimerRef.current);
      }
    };
  }, [state.status]);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderLetterBoxes = (question: Question) => {
    const word = question.wordData.word;

    return (
      <View style={styles.letterRow}>
        {word.split("").map((letter, index) => {
          const isRevealed = question.revealedLetters.includes(index);

          return (
            <View
              key={`${letter}-${index}`}
              style={[
                styles.letterBox,
                isRevealed && styles.letterBoxRevealed,
              ]}
            >
              <Text
                style={[
                  styles.letterText,
                  isRevealed && styles.letterTextRevealed,
                ]}
              >
                {isRevealed ? letter.toLocaleUpperCase("tr-TR") : ""}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (state.status === "idle") {
    const isReady = allWords.length > 0;

    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.gameOverTitle}>Dağarcık</Text>
        <Text style={styles.statsText}>
          {isReady ? "Hazır!" : "Kelimeler yükleniyor..."}
        </Text>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.statsText, { marginTop: 12 }]}>
              Sorular hazırlanıyor...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.replayButton, !isReady && styles.disabledButton]}
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
    const riskyCorrect = answered.filter((q) => q.correct && q.riskMode);
    const skippedCount = answered.filter((q) => q.skipped).length;

    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.gameOverTitle}>Oyun Bitti!</Text>

        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{state.totalScore}</Text>
          <Text style={styles.scoreLabel}>PUAN</Text>
        </View>

        <Text style={styles.statsText}>
          {correct.length}/{state.questions.length} doğru
        </Text>
        <Text style={styles.statsSubText}>Maks. Combo: {state.maxCombo}</Text>
        <Text style={styles.statsSubText}>Riskli Doğru: {riskyCorrect.length}</Text>
        <Text style={styles.statsSubText}>Pas Geçilen: {skippedCount}</Text>

        <View style={styles.endButtons}>
          <TouchableOpacity style={styles.replayButton} onPress={startGame}>
            <Text style={styles.replayButtonText}>Tekrar Oyna</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.homeButtonText}>Ana Sayfa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentQuestion) return null;

  const questionNumber = state.currentQuestionIndex + 1;
  const remainingPoints = calculateQuestionPoints(currentQuestion, state.comboCount);
  const timeColor =
    state.totalTimeLeft <= 30 ? COLORS.timerDanger : COLORS.primary;

  const comboMultiplier = getComboMultiplier(state.comboCount);
  const nextComboMultiplier = getComboMultiplier(state.comboCount + 1);
  const categoryUsed = currentQuestion.usedHints.includes("category");
  const firstLetterUsed = currentQuestion.usedHints.includes("firstLetter");
  const lastLetterUsed = currentQuestion.usedHints.includes("lastLetter");

  if (state.status === "result") {
    const basePoints = getBasePoints(currentQuestion);
    const hintPenalty = getHintPenalty(currentQuestion);

    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.timerBox}>
            <Text style={[styles.timerText, { color: timeColor }]}>
              {formatTime(state.totalTimeLeft)}
            </Text>
          </View>

          <Text style={styles.questionNum}>Soru {questionNumber}/12</Text>
          <Text style={styles.topScore}>{state.totalScore} P</Text>
        </View>

        <View
          style={[
            styles.resultCard,
            currentQuestion.correct ? styles.resultCorrect : styles.resultWrong,
          ]}
        >
          <Text style={styles.resultIcon}>
            {currentQuestion.correct ? "✓" : currentQuestion.skipped ? "↷" : "✗"}
          </Text>

          <Text style={styles.resultWord}>
            {currentQuestion.wordData.word.toLocaleUpperCase("tr-TR")}
          </Text>

          <Text style={styles.resultDef}>{currentQuestion.wordData.definition}</Text>

          <Text style={styles.resultPoints}>
            {currentQuestion.earnedPoints > 0 ? "+" : ""}
            {currentQuestion.earnedPoints} puan
          </Text>

          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>Puan Detayı</Text>
            <Text style={styles.breakdownLine}>Taban puan: {basePoints}</Text>
            <Text style={styles.breakdownLine}>İpucu cezası: -{hintPenalty}</Text>

            {currentQuestion.correct ? (
              <>
                <Text style={styles.breakdownLine}>
                  Combo çarpanı: x{getComboMultiplier(state.comboCount).toFixed(1)}
                </Text>
                <Text style={styles.breakdownLine}>
                  Risk çarpanı: x{currentQuestion.riskMode ? "1.5" : "1.0"}
                </Text>
              </>
            ) : currentQuestion.skipped ? (
              <Text style={styles.breakdownLine}>
                Pas cezası: {currentQuestion.earnedPoints}
              </Text>
            ) : (
              <Text style={styles.breakdownLine}>
                Yanlış cevap cezası: {currentQuestion.earnedPoints}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => dispatch({ type: "NEXT_QUESTION" })}
        >
          <Text style={styles.nextButtonText}>Sonraki Soru</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.timerBox}>
          <Text style={[styles.timerText, { color: timeColor }]}>
            {formatTime(state.totalTimeLeft)}
          </Text>
        </View>

        <Text style={styles.questionNum}>Soru {questionNumber}/12</Text>
        <Text style={styles.topScore}>{state.totalScore} P</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsBadgeText}>{remainingPoints} Puan</Text>
        </View>
        <Text style={styles.lengthInfo}>{currentQuestion.wordData.length} Harfli</Text>
      </View>

      <View style={styles.comboRow}>
        <View style={styles.comboInfoBox}>
          <Text style={styles.comboText}>
            {state.comboCount > 0
              ? `🔥 Combo ${state.comboCount} • x${comboMultiplier.toFixed(1)}`
              : "Combo yok"}
          </Text>
          <Text style={styles.comboSubText}>
            Sonraki doğru cevap çarpanı: x{nextComboMultiplier.toFixed(1)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.riskBadge,
            currentQuestion.riskMode && styles.riskBadgeActive,
          ]}
          onPress={() => dispatch({ type: "TOGGLE_RISK_MODE" })}
        >
          <Text
            style={[
              styles.riskBadgeText,
              currentQuestion.riskMode && styles.riskBadgeTextActive,
            ]}
          >
            {currentQuestion.riskMode ? "⚡ RİSK x1.5" : "RİSK MODU"}
          </Text>
          <Text
            style={[
              styles.riskBadgeSubText,
              currentQuestion.riskMode && styles.riskBadgeSubTextActive,
            ]}
          >
            +50% puan / sert ceza
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.definitionBox}>
        <Text style={styles.definitionText}>{currentQuestion.wordData.definition}</Text>
      </View>

      <View style={styles.infoCardsRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>Köken</Text>
          <Text style={styles.infoCardValue}>
            {currentQuestion.wordData.origin || "Türkçe"}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>Kategori</Text>
          <Text style={styles.infoCardValue}>
            {categoryUsed ? currentQuestion.wordData.category : "Açmak için kullan"}
          </Text>
        </View>
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
            onSubmitEditing={() => {
              dispatch({ type: "SUBMIT_ANSWER", answer });
              setAnswer("");
            }}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              dispatch({ type: "SUBMIT_ANSWER", answer });
              setAnswer("");
            }}
          >
            <Text style={styles.submitButtonText}>CEVAPLA</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.hintGrid}>
            <TouchableOpacity
              style={[
                styles.hintButton,
                firstLetterUsed && styles.disabledHintButton,
              ]}
              onPress={() => dispatch({ type: "USE_HINT", hint: "firstLetter" })}
              disabled={firstLetterUsed}
            >
              <Text style={styles.hintButtonText}>
                {firstLetterUsed ? "İlk Harf ✓" : "İlk Harf"}
              </Text>
              <Text style={styles.hintCost}>{firstLetterUsed ? "Kullanıldı" : "-50P"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hintButton,
                lastLetterUsed && styles.disabledHintButton,
              ]}
              onPress={() => dispatch({ type: "USE_HINT", hint: "lastLetter" })}
              disabled={lastLetterUsed}
            >
              <Text style={styles.hintButtonText}>
                {lastLetterUsed ? "Son Harf ✓" : "Son Harf"}
              </Text>
              <Text style={styles.hintCost}>{lastLetterUsed ? "Kullanıldı" : "-50P"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hintButton,
                categoryUsed && styles.disabledHintButton,
              ]}
              onPress={() => dispatch({ type: "USE_HINT", hint: "category" })}
              disabled={categoryUsed}
            >
              <Text style={styles.hintButtonText}>
                {categoryUsed ? "Kategori ✓" : "Kategori"}
              </Text>
              <Text style={styles.hintCost}>{categoryUsed ? "Kullanıldı" : "-25P"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => dispatch({ type: "SKIP_QUESTION" })}
            >
              <Text style={styles.skipButtonText}>Pas</Text>
              <Text style={styles.hintCost}>-150P</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.answerButton}
            onPress={() => {
              setAnswer("");
              dispatch({ type: "PRESS_BUTTON" });
            }}
          >
            <Text style={styles.answerButtonText}>CEVAPLA</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    padding: 20,
    justifyContent: "center",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderBox: {
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 20,
  },
  timerBox: {
    backgroundColor: COLORS.bgDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  questionNum: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  topScore: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pointsBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.white,
  },
  lengthInfo: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  comboRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  comboInfoBox: {
    flex: 1,
  },
  comboText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primaryLight,
  },
  comboSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  riskBadge: {
    borderWidth: 1,
    borderColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    alignItems: "center",
    minWidth: 140,
  },
  riskBadgeActive: {
    backgroundColor: COLORS.warning,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.warning,
  },
  riskBadgeTextActive: {
    color: COLORS.white,
  },
  riskBadgeSubText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.warning,
    marginTop: 3,
  },
  riskBadgeSubTextActive: {
    color: COLORS.white,
  },
  definitionBox: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  definitionText: {
    fontSize: 18,
    color: COLORS.white,
    lineHeight: 28,
    textAlign: "center",
  },
  infoCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  infoCardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  infoCardValue: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: "700",
  },
  letterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  letterBox: {
    width: 42,
    height: 52,
    backgroundColor: COLORS.letterBox,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.letterBoxBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  letterBoxRevealed: {
    borderColor: COLORS.letterBoxRevealed,
    backgroundColor: COLORS.bgDark,
  },
  letterText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textMuted,
  },
  letterTextRevealed: {
    color: COLORS.primaryLight,
  },
  hintGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  hintButton: {
    width: "48%",
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  disabledHintButton: {
    opacity: 0.55,
  },
  hintButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  hintCost: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  skipButton: {
    width: "48%",
    backgroundColor: "#2E0A0E",
    borderWidth: 1,
    borderColor: COLORS.wrong,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  answerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 1,
  },
  answerSection: {
    alignItems: "center",
    gap: 14,
  },
  answerTimerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.wrong,
    justifyContent: "center",
    alignItems: "center",
  },
  answerTimerText: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.white,
  },
  answerInput: {
    width: "100%",
    backgroundColor: COLORS.bgDark,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    fontSize: 20,
    color: COLORS.white,
    textAlign: "center",
  },
  submitButton: {
    width: "100%",
    backgroundColor: COLORS.buttonSuccess,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 1,
  },
  resultCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 20,
    marginBottom: 24,
  },
  resultCorrect: {
    backgroundColor: "#0A2E1A",
  },
  resultWrong: {
    backgroundColor: "#2E0A0E",
  },
  resultIcon: {
    fontSize: 52,
    color: COLORS.white,
    marginBottom: 12,
  },
  resultWord: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 8,
  },
  resultDef: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  resultPoints: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  breakdownBox: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 8,
    textAlign: "center",
  },
  breakdownLine: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  nextButton: {
    backgroundColor: COLORS.bgDark,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 24,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.bgDark,
    borderWidth: 3,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  statsText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  statsSubText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 8,
  },
  endButtons: {
    width: "100%",
    gap: 12,
    marginTop: 20,
  },
  replayButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 220,
  },
  replayButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  homeButton: {
    backgroundColor: COLORS.bgDark,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
});