import { readFileSync, writeFileSync } from "fs";
import xlsx from "xlsx";

const workbook = xlsx.readFile("C:/Users/hasan/Downloads/hint-audit.xls");
const sheet = workbook.Sheets["Revize_Hint"];

if (!sheet) {
  console.error("'Revize_Hint' sheet bulunamadı!");
  console.log("Mevcut sheet'ler:", workbook.SheetNames);
  process.exit(1);
}

const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// İlk satır header — atla
const headers = rows[0].map(h => String(h).trim().toLocaleLowerCase("tr-TR"));
console.log("Kolonlar:", headers);

// Kolon indexlerini bul
const wordIdx = headers.findIndex(h => h.includes("kelime"));
const hintIdx = headers.findIndex(h => h.includes("yeni") || h.includes("revize") || h.includes("öneri"));

if (wordIdx === -1 || hintIdx === -1) {
  console.error("'Kelime' veya 'Hint/Revize' kolonu bulunamadı!");
  console.log("Kolon başlıkları:", headers);
  process.exit(1);
}

console.log(`Kelime kolonu: ${wordIdx} (${headers[wordIdx]})`);
console.log(`Hint kolonu: ${hintIdx} (${headers[hintIdx]})`);

// Revize edilmiş hint map'i oluştur
const revisions = new Map();
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const word = row[wordIdx]?.toString().trim();
  const hint = row[hintIdx]?.toString().trim();
  if (word && hint) {
    revisions.set(word, hint);
  }
}

console.log(`\nRevize edilmiş hint sayısı: ${revisions.size}`);

// DB'yi güncelle
const db = JSON.parse(readFileSync("src/data/questions-db.json", "utf8"));
let updated = 0;
let notFound = 0;

for (const entry of db) {
  const newHint = revisions.get(entry.word);
  if (newHint) {
    entry.flashHint = newHint;
    updated++;
    revisions.delete(entry.word); // işlendi
  }
}

// Eşleşmeyenler
notFound = revisions.size;
if (notFound > 0) {
  console.log(`\nDB'de bulunamayan kelimeler (${notFound}):`);
  let count = 0;
  for (const [word] of revisions) {
    if (count++ < 20) console.log(" -", word);
  }
  if (notFound > 20) console.log(`  ... ve ${notFound - 20} tane daha`);
}

writeFileSync("src/data/questions-db.json", JSON.stringify(db, null, 2), "utf8");
console.log(`\n✓ ${updated} hint güncellendi`);
console.log(`✗ ${notFound} kelime DB'de bulunamadı`);
