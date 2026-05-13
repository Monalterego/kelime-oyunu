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
    const raw = require("../data/questions-db.json") as (QuestionDBEntry & { skip?: boolean })[];
    questionsDB = raw.filter((q) => !q.skip);
  }
  return questionsDB;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Seeded random for daily mode - same date = same questions for everyone
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function pickSeeded<T>(arr: T[], count: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, count);
}

function getDailySeed(): number {
  const today = new Date();
  const dateStr = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return dateStr;
}

export function getDailyNumber(): number {
  const start = new Date(2026, 3, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
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
          wordCount: entry.word.split(" ").length,
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

function buildDailyQuestions(pool: QuestionDBEntry[], structure: any[]): Question[] {
  const rand = seededRandom(getDailySeed());
  const questions: Question[] = [];
  for (const { length, count, preferDifficulty } of structure) {
    const byLength = pool.filter((q) => q.length === length);
    const preferred = byLength.filter((q) => q.difficulty === preferDifficulty);
    const source = preferred.length >= count ? preferred : byLength;
    const selected = pickSeeded(source, count, rand);
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
          wordCount: entry.word.split(" ").length,
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

export function generateGameQuestions(mode: "classic" | "category" | "daily" = "classic", themeCategory?: string): Question[] {
  const db = loadDB();
  if (mode === "daily") {
    return buildDailyQuestions(db, CLASSIC_STRUCTURE);
  }
  if (mode === "category" && themeCategory) {
    const pool = db.filter((q) => q.themeCategory === themeCategory);
    return buildQuestions(pool, CATEGORY_STRUCTURE);
  }
  return buildQuestions(db, CLASSIC_STRUCTURE);
}
