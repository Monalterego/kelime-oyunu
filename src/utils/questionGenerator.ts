import { Question } from "../types";

interface QuestionDBEntry {
  word: string;
  displayWord?: string;
  length: number;
  definition: string;
  gameDefinition?: string;
  origin: string;
  category: string;
  example: string;
  difficulty: "easy" | "medium" | "hard";
  flashHint?: string;
  themeCategory?: string;
  wordCount?: number;
}

const CLASSIC_STRUCTURE = [
  { length: 4, count: 2 },
  { length: 5, count: 2 },
  { length: 6, count: 2 },
  { length: 7, count: 2 },
  { length: 8, count: 2 },
  { length: 9, count: 2 },
  { length: 10, count: 2 },
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

// ── KALİTE FİLTRELERİ ─────────────────────────────────────────────────────────

const WORD_BLACKLIST = new Set([
  "ferç", "meni", "puşt", "taşak", "orkit",
  "şehvet", "orgazm", "erotik", "libido",
  "genelev", "erotiklik", "kerhaneci",
]);

// Trivial occupation/derivative suffixes: -cı/-ci/-cu/-cü/-çı/-çi/-çu/-çü/-lık/-lik/-luk/-lük
const AGENT_SUFFIX = /[cç][ıiuü]$/u;
const NOUN_SUFFIX = /l[ıiuü]k$/u;

// Definitions that signal a trivially derived word ("X yapan kişi", "X işi" etc.)
const TRIVIAL_DEF = /yapan kişi|işleten kişi|ile uğraşan|satan kişi|satan esnaf|üreten kişi|yapan usta|işi yapan|taşıyan kişi|veren kişi/iu;

// Definition patterns that indicate sexual/inappropriate content
const ADULT_DEF = /cinsel organ|üreme organ|fuhuş|cinsel ilişki|cinsel birleşme|ereksiyon/iu;

function isQualityEntry(e: QuestionDBEntry): boolean {
  const word = e.word.toLocaleLowerCase("tr-TR");
  const def = (e.gameDefinition || e.definition || "").toLocaleLowerCase("tr-TR");

  if (WORD_BLACKLIST.has(word)) return false;
  if (ADULT_DEF.test(def)) return false;
  if ((AGENT_SUFFIX.test(word) || NOUN_SUFFIX.test(word)) && TRIVIAL_DEF.test(def)) return false;

  return true;
}

// ──────────────────────────────────────────────────────────────────────────────

let filteredDB: QuestionDBEntry[] | null = null;

function loadDB(): QuestionDBEntry[] {
  if (!filteredDB) {
    const raw = require("../data/questions-db.json") as QuestionDBEntry[];
    filteredDB = raw.filter(isQualityEntry);
  }
  return filteredDB;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Görülmemiş kelimeleri öncelikle seç; yetmezse tüm havuzu kullan (per-length reset)
function pickExcludingSeen(arr: QuestionDBEntry[], count: number, seen: Set<string>): QuestionDBEntry[] {
  const unseen = arr.filter(e => !seen.has(e.word));
  const pool = unseen.length >= count ? unseen : arr;
  return pickRandom(pool, count);
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

function buildQuestions(pool: QuestionDBEntry[], structure: any[], seen: Set<string> = new Set()): Question[] {
  const questions: Question[] = [];
  for (const { length, count } of structure) {
    const byLength = pool.filter((q) => q.length === length);
    const selected = pickExcludingSeen(byLength, count, seen);

    for (const entry of selected) {
      questions.push({
        wordData: {
          word: entry.word,
          displayWord: entry.displayWord,
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

function buildDailyQuestions(pool: QuestionDBEntry[], structure: any[]): Question[] {
  const rand = seededRandom(getDailySeed());
  const questions: Question[] = [];
  for (const { length, count } of structure) {
    const byLength = pool.filter((q) => q.length === length);
    const selected = pickSeeded(byLength, count, rand);
    for (const entry of selected) {
      questions.push({
        wordData: {
          word: entry.word,
          displayWord: entry.displayWord,
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

export function generateGameQuestions(
  mode: "classic" | "category" | "daily" = "classic",
  themeCategory?: string,
  seenWords: Set<string> = new Set(),
): Question[] {
  const db = loadDB();
  if (mode === "daily") {
    // Günlük mod seed'li — anti-repeat uygulanmaz
    return buildDailyQuestions(db, CLASSIC_STRUCTURE);
  }
  if (mode === "category" && themeCategory) {
    const pool = db.filter((q) => q.themeCategory === themeCategory);
    return buildQuestions(pool, CATEGORY_STRUCTURE, seenWords);
  }
  return buildQuestions(db, CLASSIC_STRUCTURE, seenWords);
}
