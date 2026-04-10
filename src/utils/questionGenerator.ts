import { WordData, Question } from "../types";
import { generateFlashHint } from "./flashHints";

const TDK_API = "https://sozluk.gov.tr/gts?ara=";
const BATCH_SIZE = 4;
const BATCH_DELAY = 400;

export const GAME_STRUCTURE = [
  { length: 4, count: 2 },
  { length: 5, count: 2 },
  { length: 6, count: 2 },
  { length: 7, count: 2 },
  { length: 8, count: 2 },
  { length: 9, count: 2 },
  { length: 10, count: 2 },
];

export function filterWordsByLength(words: string[], length: number): string[] {
  return words.filter(
    (w) => w && w.length === length && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w)
  );
}

function sanitizeDefinition(definition: string, word: string): string {
  const regex = new RegExp(word, "gi");
  let cleaned = definition.replace(/^.*?:/g, "").trim();
  cleaned = cleaned.replace(regex, ".......");
  return cleaned.charAt(0).toLocaleUpperCase("tr-TR") + cleaned.slice(1);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWordDetails(word: string, retries = 2): Promise<WordData | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const searchWord = word.trim().toLocaleLowerCase("tr-TR");
      const res = await fetch(TDK_API + encodeURIComponent(searchWord));

      if (!res.ok) {
        if (attempt < retries) {
          await delay(500 * (attempt + 1));
          continue;
        }
        return null;
      }

      const data = await res.json();
      if (!data || !data[0] || !data[0].anlamlarListe) return null;

      const entry = data[0];
      const firstMeaning = entry.anlamlarListe[0];

      if (
        !firstMeaning.anlam ||
        firstMeaning.anlam.length < 3 ||
        firstMeaning.anlam.toLowerCase().includes("bakınız")
      ) {
        return null;
      }

      const definition = sanitizeDefinition(firstMeaning.anlam, word);
      const origin = entry.lisan || "";
      const category = firstMeaning.ozelliklerListe?.[0]?.tam_adi || "";

      return {
        word: word,
        length: word.length,
        definition,
        origin,
        category,
        example: firstMeaning.orneklerListe?.[0]?.ornek || "",
        flashHint: generateFlashHint(origin, category, word.length),
      };
    } catch (error) {
      if (attempt < retries) {
        await delay(500 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchInBatches(words: string[]): Promise<(WordData | null)[]> {
  const results: (WordData | null)[] = [];
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((w) => fetchWordDetails(w)));
    results.push(...batchResults);
    if (i + BATCH_SIZE < words.length) {
      await delay(BATCH_DELAY);
    }
  }
  return results;
}

export async function generateGameQuestions(allWords: string[]): Promise<Question[]> {
  const allCandidates: { length: number; count: number; words: string[] }[] = [];

  for (const { length, count } of GAME_STRUCTURE) {
    const candidates = filterWordsByLength(allWords, length);
    if (candidates.length === 0) continue;
    const selected = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, count * 3);
    allCandidates.push({ length, count, words: selected });
  }

  const flatWords = allCandidates.flatMap((g) => g.words);
  const allResults = await fetchInBatches(flatWords);

  const allQuestions: Question[] = [];
  let resultIndex = 0;

  for (const { length, count, words } of allCandidates) {
    const groupResults = allResults.slice(resultIndex, resultIndex + words.length);
    resultIndex += words.length;

    const groupQuestions: Question[] = [];
    for (const wordData of groupResults) {
      if (wordData && groupQuestions.length < count) {
        groupQuestions.push({
          wordData,
          points: length * 100,
          revealedLetters: [],
          answered: false,
          correct: false,
          earnedPoints: 0,
          skipped: false,
        });
      }
    }
    allQuestions.push(...groupQuestions);
  }

  if (allQuestions.length === 0) {
    throw new Error("API'den veri çekilemedi. Bağlantını kontrol et.");
  }

  return allQuestions;
}