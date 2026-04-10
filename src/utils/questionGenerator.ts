import { WordData, Question } from "../types";
import { generateFlashHint } from "./flashHints";

const TDK_API = "https://sozluk.gov.tr/gts?ara=";

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

export async function fetchWordDetails(word: string): Promise<WordData | null> {
  try {
    const searchWord = word.trim().toLocaleLowerCase("tr-TR");
    const res = await fetch(TDK_API + encodeURIComponent(searchWord), {
      headers: { "User-Agent": "Dagarcik/1.0" },
    });

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
    console.error("Fetch error for " + word, error);
    return null;
  }
}

export async function generateGameQuestions(allWords: string[]): Promise<Question[]> {
  const allQuestions: Question[] = [];

  const groupPromises = GAME_STRUCTURE.map(async ({ length, count }) => {
    const candidates = filterWordsByLength(allWords, length);
    if (candidates.length === 0) return [];

    const selectedCandidates = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, count * 5);

    const groupQuestions: Question[] = [];
    const results = await Promise.all(
      selectedCandidates.map((w) => fetchWordDetails(w))
    );

    for (const wordData of results) {
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

    return groupQuestions;
  });

  const results = await Promise.all(groupPromises);
  results.forEach((g) => allQuestions.push(...g));

  if (allQuestions.length === 0) {
    throw new Error("API'den veri çekilemedi. Bağlantını kontrol et.");
  }

  return allQuestions;
}