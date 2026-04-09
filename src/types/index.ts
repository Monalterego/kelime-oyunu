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
}

export interface GameState {
  status: "idle" | "flash" | "playing" | "answering" | "result" | "gameover";
  questions: Question[];
  currentQuestionIndex: number;
  totalScore: number;
  totalTimeLeft: number;
  answerTimeLeft: number;
  currentFlashHint: string;
}

export type GameAction =
  | { type: "START_GAME"; questions: Question[] }
  | { type: "SHOW_FLASH" }
  | { type: "FLASH_DONE" }
  | { type: "TICK_TOTAL" }
  | { type: "REQUEST_LETTER" }
  | { type: "PRESS_BUTTON" }
  | { type: "SUBMIT_ANSWER"; answer: string }
  | { type: "TICK_ANSWER" }
  | { type: "ANSWER_TIMEOUT" }
  | { type: "NEXT_QUESTION" }
  | { type: "GAME_OVER" };
