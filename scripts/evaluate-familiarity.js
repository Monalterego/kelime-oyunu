/**
 * evaluate-familiarity.js
 * 8-10 harfli medium kelimeleri (Genel+Meslekler) Claude ile tanınırlık açısından değerlendirir.
 * Skor 1-2 olanları DB'de skip:true yapar.
 *
 * Çalıştır: node scripts/evaluate-familiarity.js
 * Devam et: node scripts/evaluate-familiarity.js  (checkpoint'ten devam eder)
 */

const fs = require("fs");
const path = require("path");

const DB_PATH      = path.join(__dirname, "../src/data/questions-db.json");
const PROGRESS_PATH = path.join(__dirname, ".familiarity-progress.json");
const BATCH_SIZE   = 40;
const SKIP_THRESHOLD = 2; // 1 veya 2 alan kelimeler skip edilir

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) { console.error("ANTHROPIC_API_KEY eksik"); process.exit(1); }

async function callClaude(words) {
  const wordList = words.map((e, i) =>
    `${i + 1}. "${e.word}" — ${e.gameDefinition || e.definition || ""}`
  ).join("\n");

  const body = {
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Aşağıdaki Türkçe kelimeleri değerlendir. Her kelime için Türkiye'deki ortalama bir yetişkinin bu kelimeyi bilme olasılığını 1-5 arası puanla:

1 = Neredeyse kimse bilmez (çok arkaik, çok teknik, çok niş)
2 = Çok az kişi bilir
3 = Bir kısım eğitimli kişi bilir
4 = Çoğu yetişkin bilir
5 = Herkes bilir

Sadece JSON döndür, başka hiçbir şey yazma:
{"scores": [{"word": "kelime", "score": 3}, ...]}

Kelimeler:
${wordList}`
    }]
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: Buffer.from(JSON.stringify(body), "utf-8"),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const text = data.content[0].text.trim();
  // JSON bloğunu çıkar
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON parse hatası: " + text.slice(0, 200));
  return JSON.parse(match[0]);
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const active = db.filter(e => !e.skip);

  // Checkpoint yükle
  let progress = { evaluated: {}, lastBatch: 0 };
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf-8"));
    console.log(`Checkpoint: ${Object.keys(progress.evaluated).length} kelime değerlendirildi`);
  }

  // Tüm aktif kelimeler — daha önce evaluate edilenleri atla
  const targets = active.filter(e => !(e.word in progress.evaluated));

  const remaining = targets;
  console.log(`Kalan: ${remaining.length} / ${targets.length}`);

  const batches = [];
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    batches.push(remaining.slice(i, i + BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    process.stdout.write(`Batch ${b + 1}/${batches.length} (${batch.length} kelime)... `);

    try {
      const result = await callClaude(batch);
      result.scores.forEach(({ word, score }) => {
        progress.evaluated[word] = score;
      });
      // Eşleşmeyen varsa word listesinden bul
      batch.forEach(e => {
        if (!(e.word in progress.evaluated)) {
          progress.evaluated[e.word] = 3; // bulunamazsa orta skor ver
        }
      });

      const skipCount = result.scores.filter(s => s.score <= SKIP_THRESHOLD).length;
      console.log(`✓ (${skipCount} skip adayı)`);
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf-8");

      // Rate limit için kısa bekleme
      if (b < batches.length - 1) await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error("HATA:", err.message);
      console.log("Checkpoint kaydedildi, tekrar çalıştır.");
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf-8");
      process.exit(1);
    }
  }

  // DB'ye uygula
  const skipWords = new Set(
    Object.entries(progress.evaluated)
      .filter(([, score]) => score <= SKIP_THRESHOLD)
      .map(([word]) => word)
  );

  let skipCount = 0;
  const updated = db.map(e => {
    if (!e.skip && skipWords.has(e.word)) { skipCount++; return { ...e, skip: true }; }
    return e;
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(updated, null, 2), "utf-8");

  // Skor dağılımı
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  Object.values(progress.evaluated).forEach(s => dist[s] = (dist[s] || 0) + 1);

  console.log("\n─────────────────────────────────");
  console.log("Skor Dağılımı:");
  Object.entries(dist).forEach(([s, c]) => console.log(` ${s} puan: ${c} kelime`));
  console.log("─────────────────────────────────");
  console.log(`Skip edilen (≤${SKIP_THRESHOLD}): ${skipCount}`);
  console.log(`Aktif kalan    : ${updated.filter(e => !e.skip).length}`);
  console.log("✅ DB güncellendi.");

  if (fs.existsSync(PROGRESS_PATH)) fs.unlinkSync(PROGRESS_PATH);
}

main().catch(err => { console.error(err); process.exit(1); });
