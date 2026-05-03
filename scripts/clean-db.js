/**
 * clean-db.js
 * DB'den üç kategori kelimeyi skip:true yapar:
 * 1. Yer isimleri (tanımında ilçe/il/şehir/köy/belde geçenler + büyük harfle başlayanlar)
 * 2. Feedback'ten gelen kötü kelimeler (0 like, 1+ dislike)
 * 3. Aşırı teknik/türev: kullanıcının onayladığı liste
 *
 * Çalıştır: node scripts/clean-db.js
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../src/data/questions-db.json");

// ── 1. YER İSİMLERİ ──────────────────────────────────────────────────────────
// Tanımında açıkça coğrafi birim geçen VE büyük harfle başlayan kelimeler
const placeKeywords = [
  "ilçe", "il ", "şehir", "kent", "köy", "belde", "kasaba",
  "mahalle", "bucak", "semt", "semti", "ülkesi", "cumhuriyeti",
  "coğrafya", "dağı", "gölü", "nehri", "ırmağı", "körfezi",
  "yarımadası", "ovası", "platosunda", "limanı",
];

// ── 2. FEEDBACK'TEN GELEN KÖTÜ KELİMELER ─────────────────────────────────────
// Supabase'den gelen: 0 like, 1+ dislike olan kelimeler
const feedbackBadWords = new Set([
  // 2 dislike, 0 like
  "lağımcı", "fonetikçi", "halaoğlu", "sandırma",
  // 1 dislike, 0 like (seçili olanlar — açıkça kötü)
  "bağışlatma", "ciranta", "sıvık", "latifundia", "diskçilik",
  "katalitik", "kişnetmek", "kenaratışı", "kameriyeli", "tornalanma",
  "bademlik", "ayakçak", "fıslatmak", "ıslatıcı", "nisaiyeci",
  "mustarip", "psikopati", "laleli", "püstül", "pırnallık",
  "gevretmek", "karaşın", "çitilenmek", "düzenleyim", "prangabent",
  "esterleşme", "zuhuri", "irinlenmek", "ibrikçi", "başeksper",
  "öğrencelik", "mükeyyifat", "tekaüt", "savmacı", "lorentiyum",
  "dördüzleme", "beceriş", "gerdirilme", "yığdırmak", "yanıltmacı",
  "imlek", "imleme", "kutuplanma", "kuralı", "kamutay",
  "ayıpyerler", "gamsele", "desenlemek", "boşinanç", "ovdurma",
  "mikroplu", "korkonsül", "durayazmak", "esrimek",
  "ısırtma", "kıydırma", "heyhat", "arınık", "eğmeçli",
  "trapezci", "bakırsı", "nefyedilme", "sakırtı", "devinme",
  "küpşeker", "tohumzarı", "mütehakkim", "ötelenmek", "gömücü",
  "sarımsı", "tırmık", "sapsız", "sofracı",
  // feedback'ten gelmese de açıkça kötü
  "Doğanyurt", "Elbistan", "Bayburtlu", "Akyaka", "Artova",
  "Develi", "Taşlıçay", "Beçene",
]);

// ── 3. KULLANICININ ONAYLADIĞI EK TÜREV/TEKNİK KELİMELER ──────────────────────
// pireli, gezi, lağımcı gibi feedback'te görünenler ama listeye alınmayanlar
// (bunlar feedbackBadWords'te zaten olabilir, tekrar eklemenin zararı yok)
const extraBad = new Set([
  "pireli",      // feedback'te 2 dislike
  "lağımcı",     // zaten yukarıda
]);

// ─────────────────────────────────────────────────────────────────────────────

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

let placeCount = 0;
let feedbackCount = 0;
let alreadySkipped = 0;

const updated = db.map(entry => {
  if (entry.skip) { alreadySkipped++; return entry; }

  const word = entry.word || "";
  const def  = (entry.definition || "").toLowerCase();
  const startsUpper = /^[A-ZÇĞİÖŞÜ]/.test(word);

  // Kategori 1: yer ismi
  const isPlace = startsUpper && placeKeywords.some(kw => def.includes(kw));
  if (isPlace) {
    placeCount++;
    return { ...entry, skip: true };
  }

  // Kategori 2 & 3: feedback / teknik / türev
  if (feedbackBadWords.has(word) || extraBad.has(word)) {
    feedbackCount++;
    return { ...entry, skip: true };
  }

  return entry;
});

// Özet
const totalSkipped = updated.filter(e => e.skip).length;
console.log("─────────────────────────────────────");
console.log("DB Temizleme Raporu");
console.log("─────────────────────────────────────");
console.log(`Toplam kayıt        : ${db.length}`);
console.log(`Önceden skip        : ${alreadySkipped}`);
console.log(`Yer ismi → skip     : ${placeCount}`);
console.log(`Feedback/teknik → skip: ${feedbackCount}`);
console.log(`─────────────────────────────────────`);
console.log(`Toplam skip sonrası : ${totalSkipped}`);
console.log(`Aktif kelime        : ${db.length - totalSkipped}`);
console.log("─────────────────────────────────────");

// Kaydet
fs.writeFileSync(DB_PATH, JSON.stringify(updated, null, 2), "utf-8");
console.log("✅ questions-db.json güncellendi.");
