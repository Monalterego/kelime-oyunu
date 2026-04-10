export type HintType = "firstLetter" | "lastLetter" | "category";

export interface WordData {
  word: string;
  length: number;
  definition: string;
  origin: string;
  category: string;
  example: string;
  flashHint: string;
}

export interface Question {
  wordData: WordData;
  points: number;
  revealedLetters: number[];
  answered: boolean;
  correct: boolean;
  earnedPoints: number;
  usedHints: HintType[];
  riskMode: boolean;
  skipped: boolean;
}

export interface GameState {
  status: "idle" | "playing" | "answering" | "result" | "gameover";
  questions: Question[];
  currentQuestionIndex: number;
  totalScore: number;
  totalTimeLeft: number;
  answerTimeLeft: number;
  comboCount: number;
  maxCombo: number;
}

export type GameAction =
  | { type: "START_GAME"; questions: Question[] }
  | { type: "TICK_TOTAL" }
  | { type: "USE_HINT"; hint: HintType }
  | { type: "TOGGLE_RISK_MODE" }
  | { type: "PRESS_BUTTON" }
  | { type: "SUBMIT_ANSWER"; answer: string }
  | { type: "TICK_ANSWER" }
  | { type: "ANSWER_TIMEOUT" }
  | { type: "SKIP_QUESTION" }
  | { type: "NEXT_QUESTION" }
  | { type: "GAME_OVER" };