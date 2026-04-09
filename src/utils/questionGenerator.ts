import { WordData, Question } from "../types";
import { generateFlashHint } from "./flashHints";

const TDK_API = "https://sozluk.gov.tr/gts?ara=";

/**
 * Oyun yapısı: TV formatındaki 4h'den 10h'ye gidişi koruyoruz (toplam 14 soru).
 * 13 değil 14 soru olması (her harften 2şer) dengeyi sağlar.
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
 * Sadece Türkçe karakterleri kabul eder ve boşluklu (birleşik) kelimeleri eler.
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
 * Tanım içindeki kelimeyi temizler veya sansürler (Hukuki ve oyun kalitesi için).
 * "Araba: Dört tekerlekli araba" -> "Dört tekerlekli ......."
 */
function sanitizeDefinition(definition: string, word: string): string {
  const regex = new RegExp(word, "gi");
  // Eğer tanım kelimenin kendisiyle başlıyorsa (örn: "Araba: ...") o kısmı temizle
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
    
    // Çok kısa veya sadece "bakınız" içeren tanımları atla
    if (rawDefinition.length < 5 || rawDefinition.toLowerCase().includes("bakınız")) {
      return null;
    }

    const definition = sanitizeDefinition(rawDefinition, word);
    const example = firstMeaning.orneklerListe?.[0]?.ornek || "";
    const category = firstMeaning.ozelliklerListe?.[0]?.tam_adi || "Genel";
    const origin = entry.lisan || "Türkçe";

    const flashHint = generateFlashHint(origin, category, word.length);

    return {
      word: word.toLocaleUpperCase('tr-TR'), // Türkçe karakter uyumlu büyük harf
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
 */
export async function generateGameQuestions(
  allWords: string[]
): Promise<Question[]> {
  const questions: Question[] = [];

  for (const { length, count } of GAME_STRUCTURE) {
    const candidates = filterWordsByLength(allWords, length);
    if (candidates.length === 0) continue;

    // API hatalarına karşı 5 katı fazla aday seçiyoruz
    const selected = pickRandom(candidates, count * 5);

    let added = 0;
    for (const word of selected) {
      if (added >= count) break;

      const wordData = await fetchWordDetails(word);
      
      // wordData'nın geldiğinden ve tanımın geçerli olduğundan emin ol
      if (!wordData || wordData.definition.length < 3) continue;

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

/**
 * Offline kullanım veya manuel ekleme için soru objesi oluşturur.
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