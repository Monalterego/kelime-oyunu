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

/**
 * Filtreleme: Boşluksuz ve sadece Türkçe karakter içeren kelimeler.
 */
export function filterWordsByLength(words: string[], length: number): string[] {
  return words.filter(
    (w) => w && w.length === length && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w)
  );
}

/**
 * Sansürleme: Tanım içinde kelimenin kendisi geçiyorsa gizler.
 */
function sanitizeDefinition(definition: string, word: string): string {
  const regex = new RegExp(word, "gi");
  let cleaned = definition.replace(/^.*?:/g, "").trim();
  cleaned = cleaned.replace(regex, ".......");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * TDK API Motoru: Tekil kelime çekimi
 */
export async function fetchWordDetails(word: string): Promise<WordData | null> {
  try {
    // Türkçe karakter uyumlu arama
    const searchWord = word.trim().toLocaleLowerCase('tr-TR');
    const res = await fetch(TDK_API + encodeURIComponent(searchWord), {
      headers: { "User-Agent": "KelimeOyunu/1.0" },
    });
    
    const data = await res.json();
    if (!data || !data[0] || !data[0].anlamlarListe) return null;

    const entry = data[0];
    const firstMeaning = entry.anlamlarListe[0];
    
    if (!firstMeaning.anlam || firstMeaning.anlam.length < 3 || firstMeaning.anlam.toLowerCase().includes("bakınız")) {
      return null;
    }

    const definition = sanitizeDefinition(firstMeaning.anlam, word);
    const origin = entry.lisan || "Türkçe";
    const category = firstMeaning.ozelliklerListe?.[0]?.tam_adi || "Genel";

    return {
      word: word.toLocaleUpperCase('tr-TR'),
      length: word.length,
      definition,
      origin,
      category,
      example: firstMeaning.orneklerListe?.[0]?.ornek || "",
      flashHint: generateFlashHint(origin, category, word.length),
    };
  } catch (error) {
    console.error(`Fetch error for ${word}:`, error);
    return null;
  }
}

/**
 * Soruları Hazırlayan Ana Motor (Paralel İşleme Revizesi)
 */
export async function generateGameQuestions(allWords: string[]): Promise<Question[]> {
  const allQuestions: Question[] = [];

  // Her harf uzunluğu için paralel işlem başlatıyoruz
  const groupPromises = GAME_STRUCTURE.map(async ({ length, count }) => {
    const candidates = filterWordsByLength(allWords, length);
    if (candidates.length === 0) return [];

    // Hata payı için 5 katı fazla aday seçip aynı anda sorgula
    const selectedCandidates = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, count * 5);

    const groupQuestions: Question[] = [];
    
    // Kelimeleri paralel çek (Performansın anahtarı burası)
    const results = await Promise.all(selectedCandidates.map(w => fetchWordDetails(w)));

    for (const wordData of results) {
      if (wordData && groupQuestions.length < count) {
        groupQuestions.push({
          wordData,
          points: length * 100,
          revealedLetters: [],
          answered: false,
          correct: false,
          earnedPoints: 0,
        });
      }
    }
    return groupQuestions;
  });

  const results = await Promise.all(groupPromises);
  results.forEach(g => allQuestions.push(...g));

  if (allQuestions.length === 0) {
    throw new Error("API'den veri çekilemedi. Bağlantını kontrol et.");
  }

  return allQuestions;
}

/**
 * Manuel/Offline Soru Oluşturucu
 */
export function generateOfflineQuestion(
  word: string, definition: string, origin: string, category: string, example: string
): Question {
  return {
    wordData: {
      word: word.toLocaleUpperCase('tr-TR'),
      length: word.length,
      definition: sanitizeDefinition(definition, word),
      origin,
      category,
      example,
      flashHint: generateFlashHint(origin, category, word.length),
    },
    points: word.length * 100,
    revealedLetters: [],
    answered: false,
    correct: false,
    earnedPoints: 0,
  };
}