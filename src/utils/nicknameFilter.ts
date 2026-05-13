/**
 * Nickname filtresi
 * - Türkçe küfür / hakaret
 * - Siyasi isim + argo kombinasyonlarını önlemek için siyasi isimler
 * - Cinsel içerik
 * - Nefret söylemi
 */

// Normalize: küçük harf (TR), boşluk kaldır, yaygın harf ikamelerini düzelt
function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z]/g, ""); // geri kalan özel karakter/rakam kaldır
}

// Yasaklı kelimeler (normalize edilmiş hâlleriyle)
const BANNED: string[] = [
  // Küfür / hakaret
  "orospu", "orospucocu", "kahpe",
  "sik",                              // siken, sikiyor, sikis, siktir hepsini yakalar (includes)
  "amk", "amina", "amini", "amcik",   // "am" tek başına çok false positive verir, türevleri yeterli
  "yarak", "yarra", "yarrak",         // tek-k ve çift-k varyantları
  "got", "gotveren",                  // göt → got (normalize)
  "meme", "tasak",                    // taşak → tasak (normalize)
  "bok", "boktan",
  "oc", "pic",                        // oç → oc, piç → pic (normalize)
  "ibne", "gavat", "kaltak", "pezevenk",
  "serefsiz", "haysiyetsiz", "alçak", "alcak",
  "gerzek", "gerize", "dangalak",
  // Cinsel
  "porn", "seks", "sexs", "sex", "erotik", "hentai", "porno",
  // Nefret / ayrımcılık
  "keferesi", "gavur", "zenci", "nigger", "nigga", "faggot", "fag",
  // Siyasi isimler (kötüye kullanımı önlemek için)
  "erdogan", "tayyip", "kilicdaroglu", "bahceli", "imamoglu", "ataturk",
  "atatürk", "mustafakemal",
  // İngilizce küfür
  "fuck", "fucker", "fucking", "shit", "bitch", "asshole", "bastard", "cunt",
  "dick", "cock", "pussy", "whore", "slut",
  // Diğer
  "admin", "moderator", "destek", "support", "hece",
];

// BANNED listesini de normalize et (Türkçe karakterli girişlere karşı güvenli)
const BANNED_NORMALIZED = BANNED.map(normalize);

export function isNicknameBanned(nickname: string): boolean {
  const norm = normalize(nickname);
  return BANNED_NORMALIZED.some(banned => norm.includes(banned));
}

export function validateNickname(nickname: string): string | null {
  const trimmed = nickname.trim();

  if (trimmed.length < 3) return "En az 3 karakter olmalı";
  if (trimmed.length > 15) return "En fazla 15 karakter olabilir";
  if (!/^[a-zA-ZığüşöçİĞÜŞÖÇ0-9 ._-]+$/.test(trimmed))
    return "Sadece harf, rakam ve . _ - karakterleri kullanılabilir";
  if (isNicknameBanned(trimmed))
    return "Bu kullanıcı adı uygun değil, başka bir isim dene";

  return null; // geçerli
}
