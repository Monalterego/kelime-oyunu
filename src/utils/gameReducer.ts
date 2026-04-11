import { GameState, GameAction, Question } from "../types";

export const TOTAL_TIME = 180;
export const ANSWER_TIME = 12;
export const LETTER_PENALTY = 100;
export const HINT_DELAY = 5000;
export const HINT_DISPLAY = 4000;
export const SKIP_PENALTY_RATIO = 0.25;

export const initialGameState: GameState = {
  status: "idle",
  questions: [],
  currentQuestionIndex: 0,
  totalScore: 0,
  totalTimeLeft: TOTAL_TIME,
  answerTimeLeft: ANSWER_TIME,
  currentFlashHint: "",
};

export function getBasePoints(question: Question): number {
  return question.wordData.length * 100;
}

export function getLetterPenalty(question: Question): number {
  return question.revealedLetters.length * LETTER_PENALTY;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return {
        ...initialGameState,
        status: "playing",
        questions: action.questions,
        totalTimeLeft: TOTAL_TIME,
        currentFlashHint: action.questions[0]?.wordData.flashHint || "",
      };

    case "TICK_TOTAL": {
      const newTime = state.totalTimeLeft - 1;
      if (newTime <= 0) return { ...state, status: "gameover", totalTimeLeft: 0 };
      return { ...state, totalTimeLeft: newTime };
    }

    case "REQUEST_LETTER": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q || q.answered) return state;
      const word = q.wordData.word;
      const unrevealed = Array.from({ length: word.length }, (_, i) => i)
        .filter((i) => !q.revealedLetters.includes(i));
      if (unrevealed.length <= 1) return state;
      const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = {
        ...q,
        revealedLetters: [...q.revealedLetters, randomIndex],
      };
      return { ...state, questions: newQuestions };
    }

    case "PRESS_BUTTON":
      return { ...state, status: "answering", answerTimeLeft: ANSWER_TIME };

    case "TICK_ANSWER": {
      const newTime = state.answerTimeLeft - 1;
      if (newTime <= 0) return gameReducer(state, { type: "ANSWER_TIMEOUT" });
      return { ...state, answerTimeLeft: newTime };
    }

    case "SUBMIT_ANSWER": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q) return state;
      const isCorrect = action.answer.toLocaleLowerCase("tr-TR").trim() === q.wordData.word.toLocaleLowerCase("tr-TR").trim();
      const basePoints = getBasePoints(q);
      const letterPenalty = getLetterPenalty(q);
      const earnedPoints = isCorrect ? Math.max(0, basePoints - letterPenalty) : -basePoints;

      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = { ...q, answered: true, correct: isCorrect, earnedPoints };

      return {
        ...state,
        status: "result",
        questions: newQuestions,
        totalScore: state.totalScore + earnedPoints,
      };
    }

    case "ANSWER_TIMEOUT": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q) return state;
      const penalty = -getBasePoints(q);
      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = { ...q, answered: true, correct: false, earnedPoints: penalty };
      return { ...state, status: "result", questions: newQuestions, totalScore: state.totalScore + penalty, answerTimeLeft: 0 };
    }

    case "SKIP_QUESTION": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q || q.answered) return state;
      const penalty = -Math.round(getBasePoints(q) * SKIP_PENALTY_RATIO);
      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = { ...q, answered: true, correct: false, skipped: true, earnedPoints: penalty };
      return { ...state, status: "result", questions: newQuestions, totalScore: state.totalScore + penalty };
    }

    case "NEXT_QUESTION": {
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) return { ...state, status: "gameover" };
      return {
        ...state,
        status: "playing",
        currentQuestionIndex: nextIndex,
        answerTimeLeft: ANSWER_TIME,
        currentFlashHint: state.questions[nextIndex]?.wordData.flashHint || "",
      };
    }

    case "GAME_OVER":
      return { ...state, status: "gameover" };

    default:
      return state;
  }
}

export function calculateQuestionPoints(question: Question): number {
  return Math.max(0, getBasePoints(question) - getLetterPenalty(question));
}