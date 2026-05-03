/**
 * generate-phrases.js
 * TV yarışması formatında ikileme/deyim soruları üretir.
 * Üretilen kayıtları questions-db.json'a ekler.
 *
 * Çalıştır: node scripts/generate-phrases.js
 */

const fs   = require("fs");
const path = require("path");

const DB_PATH   = path.join(__dirname, "../src/data/questions-db.json");
const PROGRESS  = path.join(__dirname, ".phrases-progress.json");
const API_KEY   = process.env.ANTHROPIC_API_KEY;
const BATCH_SIZE = 5;

if (!API_KEY) { console.error("ANTHROPIC_API_KEY eksik"); process.exit(1); }

// ── Eklenecek ikileme / deyim listesi ──────────────────────────────────────
const PHRASES = [
  "yer yer",
  "zaman zaman",
  "eski püskü",
  "ara sıra",
  "sıkı fıkı",
  "er geç",
  "zar zor",
  "çat pat",
  "ufak tefek",
  "üç beş",
  "tıkır tıkır",
  "abuk subuk",
  "abur cubur",
  "mırın kırın",
  "yeni yıl",
];

// ── Few-shot örnekler (TV yarışmasından seçilmiş) ──────────────────────────
const FEW_SHOT = `Örnek sorular (TV yarışması formatı):

Kelime: kıpır kıpır → Soru: Heyecan/neşeyle sürekli hareket etme durumu
Kelime: ivır zıvır  → Soru: Önemsiz ve gereksiz görülen şeyler için söz öbeği
Kelime: apar topar  → Soru: Acele ile, telaşla yapılan iş için kullanılan söz
Kelime: el emeği    → Soru: Araç/alet kullanmadan yapılan iş ve o iş için harcanan emek
Kelime: can havli   → Soru: Ölüm korkusundan doğan güç
Kelime: ufak tefek  → Soru: Küçük ve ince yapılı, narin kimse veya şeyler için kullanılan söz
Kelime: salkım saçak → Soru: Dağınık, düzensiz bir şekilde sarkma/yayılma durumu
Kelime: allak bullak → Soru: Altüst olmuş, karmakarışık hâl
Kelime: apar topar  → Soru: Hazırlık yapmadan, telaşla hareket etme
Kelime: tıkır tıkır → Soru: Bir makinenin ya da işin aksaksız, düzenli ilerlediğini belirten söz`;

// ── Claude çağrısı ─────────────────────────────────────────────────────────
async function callClaude(phrases) {
  const list = phrases.map((p, i) => `${i + 1}. "${p}"`).join("\n");

  const prompt = `Sen bir Türkçe kelime oyunu için soru yazarısın. Her giriş için şunları üret:

1. gameDefinition: Kelimeyi/ifadeyi hiç kullanmadan, 8-18 kelimelik oyun ipucu. TV yarışması formatında — doğal, akıllıca, açıklayıcı.
2. flashHint: 2-5 kelimelik kısa ipucu (kategori ya da kullanım bağlamı).
3. difficulty: "easy", "medium" veya "hard"
4. themeCategory: Şunlardan biri seç: "Genel", "Gunluk Hayat", "Tarih ve Toplum", "Bilim ve Teknoloji", "Spor ve Saglik", "Sanat ve Kultur", "Doga ve Hayvanlar", "Meslekler", "Yemek ve Mutfak"

${FEW_SHOT}

ÖNEMLİ KURALLAR:
- gameDefinition'da hedef kelimeyi veya bileşenlerini KULLANMA
- Sade, anlaşılır Türkçe kullan
- İkileme/deyim olduğunu belli etme (cevabı vermez)
- Sadece JSON döndür, başka hiçbir şey yazma

Kelimeler:
${list}

Format:
[{"phrase":"yer yer","gameDefinition":"...","flashHint":"...","difficulty":"easy","themeCategory":"Genel"}, ...]`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text()}`);

  const data = await resp.json();
  const text = data.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON parse hatası: " + text.slice(0, 300));
  return JSON.parse(match[0]);
}

// ── Ana fonksiyon ──────────────────────────────────────────────────────────
async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const dbWords = new Set(db.map(e => e.word));

  // Zaten DB'de olanları atla
  const toGenerate = PHRASES.filter(p => {
    const compact = p.replace(/\s+/g, "");
    return !dbWords.has(compact);
  });

  if (toGenerate.length === 0) {
    console.log("Tüm phrase'ler zaten DB'de. Çıkılıyor.");
    return;
  }

  // Checkpoint yükle
  let progress = { done: {} };
  if (fs.existsSync(PROGRESS)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS, "utf-8"));
    console.log(`Checkpoint: ${Object.keys(progress.done).length} phrase işlendi`);
  }

  const remaining = toGenerate.filter(p => !(p in progress.done));
  console.log(`Üretilecek: ${remaining.length} / ${toGenerate.length} phrase`);

  // Batch'ler
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Batch ${Math.ceil(i/BATCH_SIZE)+1}/${Math.ceil(remaining.length/BATCH_SIZE)} ... `);

    try {
      const results = await callClaude(batch);
      results.forEach(r => { progress.done[r.phrase] = r; });
      batch.forEach(p => { if (!(p in progress.done)) progress.done[p] = null; });
      console.log("✓");
      fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
      if (i + BATCH_SIZE < remaining.length) await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error("HATA:", err.message);
      fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
      process.exit(1);
    }
  }

  // DB'ye ekle
  let added = 0;
  const newEntries = [];

  for (const [phrase, data] of Object.entries(progress.done)) {
    if (!data) continue;
    const compact = phrase.replace(/\s+/g, "");
    if (dbWords.has(compact)) continue;

    newEntries.push({
      word: compact,
      displayWord: phrase,
      length: compact.length,
      definition: "",
      gameDefinition: data.gameDefinition || "",
      flashHint: data.flashHint || "",
      difficulty: data.difficulty || "medium",
      themeCategory: data.themeCategory || "Genel",
      skip: false,
    });
    added++;
  }

  // Başa ekle (yeni kelimeler önce gelsin)
  const updated = [...newEntries, ...db];
  fs.writeFileSync(DB_PATH, JSON.stringify(updated, null, 2));

  console.log("\n✅ Tamamlandı!");
  console.log(`Eklenen: ${added} phrase`);
  console.log(`DB toplam aktif: ${updated.filter(e => !e.skip).length}`);

  // Sonuçları göster
  console.log("\nÜretilen sorular:");
  newEntries.forEach(e => {
    console.log(`\n  [${e.displayWord}] (${e.difficulty})`);
    console.log(`  Soru  : ${e.gameDefinition}`);
    console.log(`  Hint  : ${e.flashHint}`);
    console.log(`  Katkgr: ${e.themeCategory}`);
  });

  if (fs.existsSync(PROGRESS)) fs.unlinkSync(PROGRESS);
}

main().catch(err => { console.error(err); process.exit(1); });
