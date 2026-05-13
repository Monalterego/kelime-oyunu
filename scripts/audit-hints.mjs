import { readFileSync, writeFileSync } from "fs";

const db = JSON.parse(readFileSync("src/data/questions-db.json", "utf8"));

// Türkçe stop words — bunlar hint'te geçse sorun olmaz
const STOP_WORDS = new Set([
  "ve", "veya", "ile", "bir", "bu", "şu", "o", "da", "de", "ki",
  "için", "gibi", "kadar", "daha", "çok", "en", "her", "hiç",
  "olan", "olan", "olarak", "ait", "göre", "karşı", "sonra",
  "önce", "üzere", "beri", "itibaren", "arasında", "içinde",
  "üzerinde", "altında", "yanında", "etmek", "olmak", "yapmak",
  "eden", "olan", "edilen", "yapılan", "ilgili", "ait", "sahip",
]);

function tokenize(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşüâîû\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

const issues = [];

for (const entry of db) {
  if (entry.skip) continue;
  if (!entry.flashHint) continue;

  const word = entry.word.toLocaleLowerCase("tr-TR");
  const hint = entry.flashHint.toLocaleLowerCase("tr-TR");
  const def = (entry.gameDefinition || entry.definition || "").toLocaleLowerCase("tr-TR");

  const hintTokens = new Set(tokenize(hint));
  const defTokens = tokenize(def);

  const flags = [];

  // 1. Hint cevabın kendisini içeriyor
  if (hint.includes(word)) {
    flags.push("CEVABI_IÇERIYOR");
  }

  // 2. Hint cevabın ilk 4 harfini (kökünü) içeriyor
  if (word.length >= 5 && hint.includes(word.slice(0, 4)) && !hint.includes(word)) {
    flags.push("KÖK_AFIŞE");
  }

  // 3. Hint tanımdaki anlamlı kelimeleri tekrar ediyor (3+ kelime)
  const overlap = defTokens.filter(t => t.length > 3 && hintTokens.has(t));
  if (overlap.length >= 2) {
    flags.push(`TANIM_TEKRARI(${overlap.join(",")})`);
  }

  // 4. Hint çok kısa (tek kelime) — genelde yetersiz
  if (hintTokens.size <= 1) {
    flags.push("ÇOK_KISA");
  }

  if (flags.length > 0) {
    issues.push({
      word: entry.word,
      length: entry.length,
      hint: entry.flashHint,
      definition: entry.gameDefinition || entry.definition,
      flags: flags.join(" | "),
    });
  }
}

// CSV çıktısı
const header = "Kelime,Uzunluk,Hint,Tanım,Sorunlar";
const rows = issues.map(i =>
  [i.word, i.length, `"${i.hint}"`, `"${i.definition?.replace(/"/g, "'")}"`, i.flags].join(",")
);

writeFileSync("scripts/hint-audit.csv", [header, ...rows].join("\n"), "utf8");

console.log(`\nToplam sorunlu hint: ${issues.length}`);

const byCat = {};
for (const i of issues) {
  for (const f of i.flags.split(" | ")) {
    const key = f.split("(")[0];
    byCat[key] = (byCat[key] || 0) + 1;
  }
}
console.log("Kategori dağılımı:");
for (const [k, v] of Object.entries(byCat)) {
  console.log(`  ${k}: ${v}`);
}
console.log("\nDosya: scripts/hint-audit.csv");
