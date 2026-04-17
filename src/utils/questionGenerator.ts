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
  themeCategory?: string;
}

const CLASSIC_STRUCTURE = [
  { length: 4, count: 2, preferDifficulty: "easy" },
  { length: 5, count: 2, preferDifficulty: "easy" },
  { length: 6, count: 2, preferDifficulty: "medium" },
  { length: 7, count: 2, preferDifficulty: "medium" },
  { length: 8, count: 2, preferDifficulty: "medium" },
  { length: 9, count: 2, preferDifficulty: "hard" },
  { length: 10, count: 2, preferDifficulty: "hard" },
];

const CATEGORY_STRUCTURE = [
  { length: 4, count: 1 },
  { length: 5, count: 2 },
  { length: 6, count: 2 },
  { length: 7, count: 2 },
  { length: 8, count: 1 },
  { length: 9, count: 1 },
  { length: 10, count: 1 },
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

function buildQuestions(pool: QuestionDBEntry[], structure: any[]): Question[] {
  const questions: Question[] = [];
  for (const { length, count, preferDifficulty } of structure) {
    const byLength = pool.filter((q) => q.length === length);
    const preferred = byLength.filter((q) => q.difficulty === preferDifficulty);
    const source = preferred.length >= count ? preferred : byLength;
    const selected = pickRandom(source, count);

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

export function generateGameQuestions(mode: "classic" | "category" = "classic", themeCategory?: string): Question[] {
  const db = loadDB();

  if (mode === "category" && themeCategory) {
    const pool = db.filter((q) => q.themeCategory === themeCategory);
    return buildQuestions(pool, CATEGORY_STRUCTURE);
  }

  return buildQuestions(db, CLASSIC_STRUCTURE);
}