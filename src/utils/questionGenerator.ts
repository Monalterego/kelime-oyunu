import { Question } from "../types";

interface QuestionDBEntry {
  word: string;
  length: number;
  definition: string;
  gameDefinition?: string;
  origin: string;
  category: string;
  example: string;
  difficulty: "easy" | "medium" | "hard";
  flashHint?: string;
}

const GAME_STRUCTURE = [
  { length: 4, count: 2, preferDifficulty: "easy" },
  { length: 5, count: 2, preferDifficulty: "easy" },
  { length: 6, count: 2, preferDifficulty: "medium" },
  { length: 7, count: 2, preferDifficulty: "medium" },
  { length: 8, count: 2, preferDifficulty: "medium" },
  { length: 9, count: 2, preferDifficulty: "hard" },
  { length: 10, count: 2, preferDifficulty: "hard" },
];

let questionsDB: QuestionDBEntry[] | null = null;

function loadDB(): QuestionDBEntry[] {
  if (!questionsDB) {
    questionsDB = require("../data/questions-db.json") as QuestionDBEntry[];
  }
  return questionsDB;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateGameQuestions(): Question[] {
  const db = loadDB();
  const questions: Question[] = [];

  for (const { length, count, preferDifficulty } of GAME_STRUCTURE) {
    const byLength = db.filter((q) => q.length === length);
    const preferred = byLength.filter((q) => q.difficulty === preferDifficulty);
    const pool = preferred.length >= count ? preferred : byLength;
    const selected = pickRandom(pool, count);

    for (const entry of selected) {
      questions.push({
        wordData: {
          word: entry.word,
          length: entry.length,
          definition: entry.gameDefinition || entry.definition,
          origin: entry.origin,
          category: entry.category,
          example: entry.example,
          flashHint: entry.flashHint || "",
        },
        points: entry.length * 100,
        revealedLetters: [],
        answered: false,
        correct: false,
        earnedPoints: 0,
        skipped: false,
      });
    }
  }

  return questions;
}