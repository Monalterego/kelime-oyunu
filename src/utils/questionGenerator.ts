import { WordData, Question } from "../types";
import { generateFlashHint } from "./flashHints";

const TDK_API = "https://sozluk.gov.tr/gts?ara=";

/**
 * Oyun yapısı: TV formatındaki 4h'den 10h'ye gidişi koruyoruz (toplam 14 soru).
 */
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
 * Kelime listesinden harf sayısına göre filtreleme yapar.
 * Sadece Türkçe karakterleri kabul eder ve boşluklu kelimeleri eler.
 */
export function filterWordsByLength(words: string[], length: number): string[] {
  return words.filter(
    (w) => w.length === length && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w)
  );
}

/**
 * Diziden rastgele n adet eleman seçer.
 */
export function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Tanım içindeki kelimeyi temizler veya sansürler.
 */
function sanitizeDefinition(definition: string, word: string): string {
  if (!definition) return "";
  const regex = new RegExp(word, "gi");
  // Baştaki "Kelime:" veya "İsim:" gibi ibareleri temizle
  let cleaned = definition.replace(/^.*?:/g, "").trim();
  // Tanım içinde kelime geçiyorsa sansürle
  cleaned = cleaned.replace(regex, ".......");
  // İlk harfi büyüt
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * TDK API'den kelime detaylarını çeker.
 */
export async function fetchWordDetails(word: string): Promise<WordData | null> {
  try {
    const res = await fetch(TDK_API + encodeURIComponent(word.toLowerCase()), {
      headers: { "User-Agent": "KelimeOyunu/1.0" },
    });
    const data = await res.json();

    if (!data || !data[0]) return null;

    const entry = data[0];
    const firstMeaning = entry.anlamlarListe?.[0];
    
    if (!firstMeaning || !firstMeaning.anlam) return null;

    const rawDefinition = firstMeaning.anlam;
    
    // Geçersiz tanımları ele (çok kısa veya yönlendirme içerenler)
    if (rawDefinition.length < 5 || rawDefinition.toLowerCase().includes("bakınız")) {
      return null;
    }

    const definition = sanitizeDefinition(rawDefinition, word);
    const example = firstMeaning.orneklerListe?.[0]?.ornek || "";
    const category = firstMeaning.ozelliklerListe?.[0]?.tam_adi || "Genel";
    const origin = entry.lisan || "Türkçe";

    const flashHint = generateFlashHint(origin, category, word.length);

    return {
      word: word.toLocaleUpperCase('tr-TR'),
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

/**
 * Dinamik oyun sorularını üretir.
 * Paralel fetch (Promise.all) kullanarak hızı artırılmıştır.
 */
export async function generateGameQuestions(
  allWords: string[]
): Promise<Question[]> {
  const questions: Question[] = [];

  // Önce tüm kelimeleri harf uzunluklarına göre bir Map'e koyalım (Performans)
  const wordMap = new Map<number, string[]>();
  GAME_STRUCTURE.forEach(({ length }) => {
    wordMap.set(length, filterWordsByLength(allWords, length));
  });

  // Her harf grubu için işlemleri yürüt
  for (const { length, count } of GAME_STRUCTURE) {
    const candidates = wordMap.get(length) || [];
    if (candidates.length === 0) continue;

    // API hataları veya geçersiz tanımlar için yedekli (count * 4) seçim yap
    const selectedBatch = pickRandom(candidates, count * 4);
    
    // Paralel istekleri başlat
    const batchPromises = selectedBatch.map(word => fetchWordDetails(word));
    const batchResults = await Promise.all(batchPromises);

    // null olmayan ve geçerli olan sonuçları ayıkla
    const validBatch = batchResults
      .filter((r): r is WordData => r !== null && r.definition.length > 3)
      .slice(0, count);

    validBatch.forEach((wordData) => {
      questions.push({
        wordData,
        points: length * 100,
        revealedLetters: [],
        answered: false,
        correct: false,
        earnedPoints: 0,
      });
    });
  }

  return questions;
}

/**
 * Offline kullanım için soru objesi oluşturur.
 */
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
      word: word.toLocaleUpperCase('tr-TR'),
      length: word.length,
      definition: sanitizeDefinition(definition, word),
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