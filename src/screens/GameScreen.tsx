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

  // Oyunu baslat
  const startGame = () => {
    dispatch({ type: "START_GAME", questions: SAMPLE_QUESTIONS });
  };

  // Flash ipucu animasyonu
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

  // Total timer
  useEffect(() => {
    if (state.status === "playing") {
      totalTimerRef.current = setInterval(() => {
        dispatch({ type: "TICK_TOTAL" });
      }, 1000);
    } else {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [state.status]);

  // Answer timer
  useEffect(() => {
    if (state.status === "answering") {
      answerTimerRef.current = setInterval(() => {
        dispatch({ type: "TICK_ANSWER" });
      }, 1000);
    } else {
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    }
    return () => { if (answerTimerRef.current) clearInterval(answerTimerRef.current); };
  }, [state.status]);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  // Harf kutularini render et
  const renderLetterBoxes = (question: Question) => {
    const word = question.wordData.word;
    return (
      <View style={styles.letterRow}>
        {word.split("").map((letter, i) => {
          const isRevealed = question.revealedLetters.includes(i);
          return (
            <View key={i} style={[styles.letterBox, isRevealed && styles.letterBoxRevealed]}>
              <Text style={styles.letterText}>
                {isRevealed ? letter.toLocaleUpperCase("tr-TR") : ""}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Format sure (mm:ss)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return 
