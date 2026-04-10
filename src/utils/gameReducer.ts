import { GameState, GameAction, Question, HintType } from "../types";

export const TOTAL_TIME = 180;
export const ANSWER_TIME = 12;

const HINT_COSTS: Record<HintType, number> = {
  firstLetter: 50,
  lastLetter: 50,
  category: 25,
};

export const initialGameState: GameState = {
  status: "idle",
  questions: [],
  currentQuestionIndex: 0,
  totalScore: 0,
  totalTimeLeft: TOTAL_TIME,
  answerTimeLeft: ANSWER_TIME,
  comboCount: 0,
  maxCombo: 0,
};

export function getBasePoints(question: Question): number {
  return question.wordData.length * 100;
}

export function getHintPenalty(question: Question): number {
  const HINT_COSTS: Record<HintType, number> = {
    firstLetter: 50,
    lastLetter: 50,
    category: 25,
  };

return question.usedHints.reduce((sum, hint) => sum + HINT_COSTS[hint], 0);
}

export function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 5) return 1.4;
  if (comboCount >= 3) return 1.2;
  if (comboCount >= 2) return 1.1;
  return 1;
}

function revealIndexForHint(question: Question, hint: HintType): number[] {
  const length = question.wordData.word.length;

  switch (hint) {
    case "firstLetter":
      return question.revealedLetters.includes(0)
        ? question.revealedLetters
        : [...question.revealedLetters, 0];

    case "lastLetter": {
      const lastIndex = length - 1;
      return question.revealedLetters.includes(lastIndex)
        ? question.revealedLetters
        : [...question.revealedLetters, lastIndex];
    }

    case "category":
      return question.revealedLetters;

    default:
      return question.revealedLetters;
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return {
        ...initialGameState,
        status: "playing",
        questions: action.questions,
        totalTimeLeft: TOTAL_TIME,
      };

    case "TICK_TOTAL": {
      const newTime = state.totalTimeLeft - 1;
      if (newTime <= 0) {
        return { ...state, status: "gameover", totalTimeLeft: 0 };
      }
      return { ...state, totalTimeLeft: newTime };
    }

    case "USE_HINT": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q || q.answered) return state;

      if (q.usedHints.includes(action.hint)) return state;

      const updatedQuestion: Question = {
        ...q,
        usedHints: [...q.usedHints, action.hint],
        revealedLetters: revealIndexForHint(q, action.hint),
      };

      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = updatedQuestion;

      return {
        ...state,
        questions: newQuestions,
      };
    }

    case "TOGGLE_RISK_MODE": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q || q.answered) return state;

      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = {
        ...q,
        riskMode: !q.riskMode,
      };

      return {
        ...state,
        questions: newQuestions,
      };
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

      const normalizedAnswer = action.answer.toLocaleLowerCase("tr-TR").trim();
      const normalizedWord = q.wordData.word.toLocaleLowerCase("tr-TR").trim();
      const isCorrect = normalizedAnswer === normalizedWord;

      const basePoints = getBasePoints(q);
      const hintPenalty = getHintPenalty(q);

      let earnedPoints = 0;
      let newCombo = state.comboCount;

      if (isCorrect) {
        newCombo = state.comboCount + 1;
        const comboMultiplier = getComboMultiplier(newCombo);
        const riskMultiplier = q.riskMode ? 1.5 : 1;
        earnedPoints = Math.max(
          0,
          Math.round((basePoints - hintPenalty) * comboMultiplier * riskMultiplier)
        );
      } else {
        newCombo = 0;
        earnedPoints = q.riskMode
          ? -Math.round(basePoints * 1.5)
          : -basePoints;
      }

      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = {
        ...q,
        answered: true,
        correct: isCorrect,
        earnedPoints,
      };

      return {
        ...state,
        status: "result",
        questions: newQuestions,
        totalScore: state.totalScore + earnedPoints,
        comboCount: newCombo,
        maxCombo: Math.max(state.maxCombo, newCombo),
      };
    }

    case "ANSWER_TIMEOUT": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q) return state;

      const penalty = q.riskMode
        ? -Math.round(getBasePoints(q) * 1.5)
        : -getBasePoints(q);

      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = {
        ...q,
        answered: true,
        correct: false,
        earnedPoints: penalty,
      };

      return {
        ...state,
        status: "result",
        questions: newQuestions,
        totalScore: state.totalScore + penalty,
        answerTimeLeft: 0,
        comboCount: 0,
      };
    }

    case "SKIP_QUESTION": {
      const q = state.questions[state.currentQuestionIndex];
      if (!q) return state;

      const penalty = -150;
      const newQuestions = [...state.questions];
      newQuestions[state.currentQuestionIndex] = {
        ...q,
        answered: true,
        correct: false,
        skipped: true,
        earnedPoints: penalty,
      };

      return {
        ...state,
        status: "result",
        questions: newQuestions,
        totalScore: state.totalScore + penalty,
        comboCount: 0,
      };
    }

    case "NEXT_QUESTION": {
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, status: "gameover" };
      }
      return {
        ...state,
        status: "playing",
        currentQuestionIndex: nextIndex,
        answerTimeLeft: ANSWER_TIME,
      };
    }

    case "GAME_OVER":
      return { ...state, status: "gameover" };

    default:
      return state;
  }
}

export function calculateQuestionPoints(question: Question, comboCount = 0): number {
  const basePoints = getBasePoints(question);
  const hintPenalty = getHintPenalty(question);
  const comboMultiplier = getComboMultiplier(comboCount);
  const riskMultiplier = question.riskMode ? 1.5 : 1;

  return Math.max(
    0,
    Math.round((basePoints - hintPenalty) * comboMultiplier * riskMultiplier)
  );
}