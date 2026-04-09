import { WordData, Question } from "../types";
import { generateFlashHint } from "./flashHints";

const TDK_API = "https://sozluk.gov.tr/gts?ara=";
const AUTOCOMPLETE_PATH = "../data/autocomplete.json";

// Oyun yapisi: 4h(2), 5h(2), 6h(2), 7h(2), 8h(2), 9h(2), 10h(2) = 13 soru
export const GAME_STRUCTURE = [
  { length: 4, count: 2 },
  { length: 5, count: 2 },
  { length: 6, count: 2 },
  { length: 7, count: 2 },
  { length: 8, count: 2 },
  { length: 9, count: 2 },
  { length: 10, count: 2 },
];

// Kelime listesinden harf sayisina gore filtrele
export function filterWordsByLength(words: string[], length: number): string[] {
  return words.filter(
    (w) => w.length === length && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w)
  );
}

// Rastgele n kelime sec
export function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// TDK API'den kelime detaylarini cek
export async function fetchWordDetails(word: string): Promise<WordData | null> {
  try {
    const res = await fetch(TDK_API + encodeURIComponent(word), {
      headers: { "User-Agent": "KelimeOyunu/1.0" },
    });
    const data = await res.json();

    if (!data || !data[0]) return null;

    const entry = data[0];
    const firstMeaning = entry.anlamlarListe?.[0];
    const definition = firstMeaning?.anlam || "";
    const example = firstMeaning?.orneklerListe?.[0]?.ornek || "";
    const category = firstMeaning?.ozelliklerListe?.[0]?.tam_adi || "";
    const origin = entry.lisan || "";

    // Cok kisa veya anlamsiz tanimlar icin skip
    if (!definition || definition.length < 5) return null;

    const flashHint = generateFlashHint(origin, category, word.length);

    return {
      word: entry.madde || word,
      length: word.length,
      definition,
      origin,
      category,
      example,
      flashHint,
    };
  } catch (error) {
    console.error("TDK fetch error for", word, error);
    return null;
  }
}

// Tek bir oyun icin 13 soru uret
export async function generateGameQuestions(
  allWords: string[]
): Promise<Question[]> {
  const questions: Question[] = [];

  for (const { length, count } of GAME_STRUCTURE) {
    const candidates = filterWordsByLength(allWords, length);
    // Yeterli aday yoksa atla
    if (candidates.length === 0) continue;

    // Daha fazla aday sec, API'den detay cekerken bos donenler olabilir
    const selected = pickRandom(candidates, count * 3);

    let added = 0;
    for (const word of selected) {
      if (added >= count) break;

      const wordData = await fetchWordDetails(word);
      if (!wordData) continue;

      questions.push({
        wordData,
        points: length * 100,
        revealedLetters: [],
        answered: false,
        correct: false,
        earnedPoints: 0,
      });
      added++;
    }
  }

  return questions;
}

// Offline soru uretimi (onceden hazirlanmis veriden)
export function generateOfflineQuestion(
  word: string,
  definition: string,
  origin: string,
  category: string,
  example: string
): Question {
  const flashHint = generateFlashHint(origin, category, word.length);
  return {
    wordData: {
      word,
      length: word.length,
      definition,
      origin,
      category,
      example,
      flashHint,
    },
    points: word.length * 100,
    revealedLetters: [],
    answered: false,
    correct: false,
    earnedPoints: 0,
  };
}
