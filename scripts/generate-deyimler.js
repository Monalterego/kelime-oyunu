/**
 * generate-deyimler.js
 * TDK deyimlerinden TV yarışması formatında soru üretir,
 * DB'ye ekler.
 *
 * Çalıştır : node scripts/generate-deyimler.js
 * Devam et : node scripts/generate-deyimler.js  (checkpoint'ten devam)
 * Tahmini  : ~$0.40, ~8-10 dakika
 */

const fs   = require("fs");
const path = require("path");

const DB_PATH  = path.join(__dirname, "../src/data/questions-db.json");
const RAW_PATH = path.join(__dirname, ".deyimler-raw.json");
const PROGRESS = path.join(__dirname, ".deyimler-progress.json");
const BATCH    = 20;
const DELAY    = 500;

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY eksik"); process.exit(1); }

// ── Few-shot örnekler ──────────────────────────────────────────────────────
const EXAMPLES = `Aşağıdaki örnekler gibi yaz:

DEYIM          | ANLAMI (TDK)                              | GAMEDEFİNİTION                                              | FLASHHINT         | ZORLUK
---------------|-------------------------------------------|-------------------------------------------------------------|-------------------|-------
el açmak       | dilenmek, yardım istemek                  | Onurunu/gururunu hiçe sayarak birinden yardım dilemek       | Gurur, dilenmek   | medium
taş atmak      | dolaylı iğneleyici söz söylemek           | Birini doğrudan değil, üstü kapalı sözlerle incitmek        | Üstü kapalı, iğne | medium
iç etmek       | eline geçeni mal etmek (argo)             | Argoda başkasının malını fırsatçılıkla kendine geçirmek     | Argo, dolandırıcı | hard
kazık yemek    | aldatılmak                                | Fazla para ödemek ya da kandırılmak                         | Aldatmak, para    | easy
fitil olmak    | çok kızmak; sarhoş olmak (argo)           | Öfkeden ya da içkiden kontrolünü kaybetmek                  | Öfke, argo        | medium
ateş gibi      | çok sıcak; zeki ve becerikli              | Hem sıcaklık hem zekâ için kullanılan benzetme              | Sıcak, zekâ       | easy
toz olmak      | kaçmak, uzaklaşmak (argo)                 | Argoda sessizce ortamdan sıvışıp gitmek                     | Argo, kaçmak      | medium
boy atmak      | boyu uzamak, gelişmek                     | Özellikle çocuklarda fiziksel büyüme ve gelişme             | Büyüme, çocuk     | easy
ev bozmak      | karı koca ayrılmak / ayrılmalarına neden olmak | Bir evliliği ya da aile düzenini bitirmek             | Boşanma, aile     | medium
cadı gibi      | saçı başı dağınık; çok becerikli (kadın) | Dağınık görünüşlü ya da olağanüstü becerikli kadın için     | Karakter, kadın   | medium
kazan kepçe    | bir yeri etraflıca dolaşmak/aramak        | Her köşeyi tek tek gezmek veya aramak                       | Arama, dolaşma    | hard
içi yanmak     | çok susamak; büyük acıyla üzülmek         | Susamaktan ya da büyük acıdan bunalmak                      | Susuzluk, acı     | easy`;

// ── Zorluk belirleyici ────────────────────────────────────────────────────
function guessDifficulty(anlami) {
  const a = anlami.toLowerCase();
  if (a.includes("esk.") || a.includes("hlk.") || a.includes("mec.")) return "hard";
  if (a.includes("argo")) return "medium";
  return "medium";
}

// ── Claude çağrısı ────────────────────────────────────────────────────────
async function generateBatch(entries) {
  const list = entries.map((e, i) =>
    `${i + 1}. Deyim: "${e.display}" | TDK Anlamı: "${e.anlami.slice(0, 120)}"`
  ).join("\n");

  const prompt = `Sen bir Türkçe kelime yarışması için soru yazarısın. Her deyim için:

1. gameDefinition: Deyimi kullanmadan, 6-16 kelimelik oyun sorusu. Yukarıdaki örnekler gibi doğal ve akıllıca.
2. flashHint: 2-4 kelimelik bağlam ipucu.
3. difficulty: "easy", "medium" veya "hard"
4. themeCategory: Şunlardan biri: "Genel", "Gunluk Hayat", "Tarih ve Toplum", "Bilim ve Teknoloji", "Spor ve Saglik", "Sanat ve Kultur", "Doga ve Hayvanlar", "Meslekler", "Yemek ve Mutfak"

${EXAMPLES}

KURALLAR:
- Deyimin kendisini gameDefinition'da KULLANMA
- Birden fazla anlamı varsa en yaygın/ilginç olanını seç
- "Mecazen..." ile başla eğer mecaz anlam ön plandaysa
- Sadece JSON döndür, başka hiçbir şey yazma

Deyimler:
${list}

Format:
[{"phrase":"deyim","gameDefinition":"...","flashHint":"...","difficulty":"...","themeCategory":"..."}, ...]`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 3500,
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

// ── Ana fonksiyon ─────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error("Önce deyimleri çekmek için fetch scriptini çalıştır.");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf-8"));
  const db  = JSON.parse(fs.readFileSync(DB_PATH,  "utf-8"));
  const dbAll = new Set(db.map(e => e.word));

  // Sorunlu kayıtları filtrele
  const BAD = new Set(["birokadar","hlomasal","işievurmak","okadar","olura","ogünbugün","dememo","işiedökmek"]);
  const candidates = raw.filter(r =>
    r.isNew &&
    !BAD.has(r.word) &&
    r.display.split(" ").every(p => p.length >= 2) &&
    !dbAll.has(r.word)
  );

  console.log(`Aday deyim : ${candidates.length}`);

  // Checkpoint yükle
  let progress = { done: {} };
  if (fs.existsSync(PROGRESS)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS, "utf-8"));
    console.log(`Checkpoint : ${Object.keys(progress.done).length} işlendi`);
  }

  const remaining   = candidates.filter(e => !(e.word in progress.done));
  const totalBatches = Math.ceil(remaining.length / BATCH);
  console.log(`Kalan      : ${remaining.length}`);
  console.log(`Batch      : ${totalBatches}`);
  console.log(`Tahmini    : ~$${(totalBatches * 0.004).toFixed(2)}\n`);

  for (let i = 0; i < remaining.length; i += BATCH) {
    const batch    = remaining.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;

    process.stdout.write(`Batch ${batchNum}/${totalBatches} ... `);

    try {
      const results = await generateBatch(batch);

      batch.forEach(entry => {
        const match = results.find(r =>
          r.phrase && (
            r.phrase === entry.display ||
            r.phrase.replace(/\s+/g, "") === entry.word
          )
        );
        progress.done[entry.word] = match ? {
          gameDefinition: match.gameDefinition,
          flashHint:      match.flashHint,
          difficulty:     match.difficulty || guessDifficulty(entry.anlami),
          themeCategory:  match.themeCategory || "Genel",
          display:        entry.display,
          length:         entry.length,
          anlami:         entry.anlami,
        } : null;
      });

      console.log("✓");

      if (batchNum % 10 === 0) {
        fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
      }

      if (i + BATCH < remaining.length) {
        await new Promise(r => setTimeout(r, DELAY));
      }
    } catch (err) {
      console.error("HATA:", err.message);
      fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
      console.log("Checkpoint kaydedildi. Tekrar çalıştır.");
      process.exit(1);
    }
  }

  fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));

  // DB'ye ekle
  console.log("\nDB güncelleniyor...");
  const newEntries = [];
  let nullCount = 0;

  for (const [word, data] of Object.entries(progress.done)) {
    if (!data) { nullCount++; continue; }
    if (dbAll.has(word)) continue;

    newEntries.push({
      word,
      displayWord:    data.display,
      length:         data.length,
      definition:     data.anlami,
      gameDefinition: data.gameDefinition,
      flashHint:      data.flashHint,
      difficulty:     data.difficulty,
      themeCategory:  data.themeCategory,
      skip: false,
    });
  }

  const updated = [...newEntries, ...db];
  fs.writeFileSync(DB_PATH, JSON.stringify(updated, null, 2));

  console.log(`\n✅ Tamamlandı!`);
  console.log(`Eklenen    : ${newEntries.length}`);
  console.log(`Atılan     : ${nullCount}`);
  console.log(`DB aktif   : ${updated.filter(e => !e.skip).length}`);

  // Örnek çıktı
  console.log("\nÖrnek eklenen deyimler:");
  newEntries.sort(() => Math.random() - 0.5).slice(0, 10).forEach(e => {
    console.log(`\n  [${e.displayWord}] (${e.difficulty} / ${e.themeCategory})`);
    console.log(`  Soru : ${e.gameDefinition}`);
    console.log(`  Hint : ${e.flashHint}`);
  });

  if (fs.existsSync(PROGRESS)) fs.unlinkSync(PROGRESS);
}

main().catch(err => { console.error(err); process.exit(1); });
