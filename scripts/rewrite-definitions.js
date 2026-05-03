/**
 * rewrite-definitions.js
 * Tüm aktif kelimelerin gameDefinition + flashHint alanlarını
 * TV yarışması formatında yeniden üretir.
 *
 * Çalıştır : node scripts/rewrite-definitions.js
 * Devam et : node scripts/rewrite-definitions.js  (checkpoint'ten devam)
 * Tahmini  : ~$0.80-1.00, ~15-20 dakika
 */

const fs   = require("fs");
const path = require("path");

const DB_PATH  = path.join(__dirname, "../src/data/questions-db.json");
const PROGRESS = path.join(__dirname, ".rewrite-progress.json");
const BATCH    = 20;
const DELAY    = 500;

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY eksik"); process.exit(1); }

// ── Few-shot örnekler (TV yarışmasından seçilmiş, farklı kelime tipleri) ──
const EXAMPLES = `Aşağıda iyi soru örnekleri var. Bunları referans al:

KELIME       | GAMEDEFİNİTİON (oyun sorusu)                                              | FLASHHINT
-------------|---------------------------------------------------------------------------|------------------
heba         | Hiçbir işe yaramadan yok olma, boşa gitme                                | Emek, israf
miço         | Gemici çırağı                                                             | Denizcilik
boğuk        | Net olarak anlaşılmayan, güçlükle çıkan kısık sesi niteleyen sıfat        | Ses tonu
reflü        | Mide içeriğinin yemek borusuna geri kaçmasıyla oluşan sindirim sorunu     | Mide, yanma
karmak       | Toz hâldeki bir şeyi sıvıyla karıştırıp çamur/hamur hâline getirmek       | Mutfak, hamur
virtüöz      | Bir müzik aletini büyük ustalıkla çalabilen sanatçı                        | Müzik, ustalık
alaturka     | Türk usulü anlamına gelen, Batılılarca kullanılan tabir                    | Batı, Türk tarzı
çarpıklık    | Bir şeyin düzgün olmama hâli, eğrilik                                      | Şekil, bozukluk
kıpır kıpır  | Heyecan ya da neşeyle sürekli hareket etme durumu                          | Çocuk, canlılık
ivır zıvır   | Önemsiz ve gereksiz görülen şeyler için kullanılan söz öbeği                | Dağınıklık
el emeği     | Araç veya alet kullanmadan yapılan iş; o iş için harcanan çaba             | El sanatı
can havli    | Ölüm korkusundan doğan olağanüstü güç                                      | Tehlike, güç
kontrat      | Sözleşmenin Fransızca kökenli eş anlamlısı                                 | Hukuk, anlaşma
serkeş       | Kafa tutan, baş kaldıran, başına buyruk kimse                               | Asi, inatçı
mübadil      | Devletlerarası anlaşmayla zorunlu yer değiştirilen kişi                     | Tarih, göç
hak yemek    | Birinin maddi kazanımlarını adaletsizce ele geçirmek                        | Haksızlık
demirbaş     | Kuruma kayıtlı, kalıcı kullanım eşyası                                     | Kurum, envanter
peyderpey    | Azar azar, bölüm bölüm, yavaş yavaş                                        | Zaman, yavaşlık
bıngıldak    | Bebeklerde kafatası kemiklerinin birleşme yerindeki yumuşak kıkırdak bölüm  | Bebek, kafa
aparkat      | Doğru noktaya vurulduğunda rakibin ayağını yerden kesen yumruk türü         | Boks, teknik
kerli ferli  | Kılık kıyafeti düzgün, olgun ve dikkat çekici erkekler için kullanılan tabir | Şıklık, erkek
ankastre     | Mutfak dolaplarına gömülen ocak, fırın gibi beyaz eşyaları niteleyen söz    | Mutfak, mobilya
pepe         | Konuşurken bazı sesleri çıkaramayan kişiler için kullanılan söz             | Konuşma, engel
çitlembik    | Menengiç bitkisinin diğer adı; sevimli küçük kız çocukları için de kullanılır | Bitki, sevgi
güderi       | Geyik veya keçi derisinden yapılmış yumuşak ve mat meşin                   | Deri, malzeme`;

// ── Claude çağrısı ─────────────────────────────────────────────────────────
async function rewriteBatch(entries) {
  const wordList = entries.map((e, i) => {
    const base = e.definition || e.gameDefinition || "";
    const display = e.displayWord || e.word;
    return `${i + 1}. Kelime: "${display}" | Mevcut tanım: "${base.slice(0, 120)}"`;
  }).join("\n");

  const prompt = `Sen bir Türkçe kelime yarışması için soru yazarısın.

${EXAMPLES}

KURALLAR:
- gameDefinition: Kelimeyi hiç kullanmadan, 6-16 kelimelik oyun sorusu/ipucu. Yukarıdaki örnekler gibi doğal, akıllıca, tanımlayıcı.
- flashHint: 2-4 kelimelik bağlam ipucu (kategori, kullanım alanı ya da çağrışım).
- Ansiklopedik veya robotik dil kullanma. TV yarışması tadında olsun.
- Kelimenin kendisini ya da kökünü gameDefinition içinde KULLANMA.
- Mecaz anlam varsa "Mecazen..." ile başla.
- Yabancı kökenli eş anlamlıysa "X'in Fransızca/Arapça/İngilizce kökenli eş anlamlısı" kalıbını kullanabilirsin.
- Sadece JSON döndür, başka hiçbir şey yazma.

Kelimeler:
${wordList}

Yanıt formatı:
[{"word":"kelime","gameDefinition":"...","flashHint":"..."}, ...]`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
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
  const db     = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const active = db.filter(e => !e.skip);

  // Checkpoint yükle
  let progress = { done: {} };
  if (fs.existsSync(PROGRESS)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS, "utf-8"));
    const doneCount = Object.keys(progress.done).length;
    console.log(`Checkpoint: ${doneCount} kelime işlendi`);
  }

  const remaining = active.filter(e => !(e.word in progress.done));
  const totalBatches = Math.ceil(remaining.length / BATCH);

  console.log(`Aktif kelime : ${active.length}`);
  console.log(`Kalan        : ${remaining.length}`);
  console.log(`Batch sayısı : ${totalBatches}`);
  console.log(`Tahmini maliyet: ~$${(totalBatches * 0.003).toFixed(2)}\n`);

  let saved = 0;

  for (let i = 0; i < remaining.length; i += BATCH) {
    const batch    = remaining.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;

    process.stdout.write(`Batch ${batchNum}/${totalBatches} ... `);

    try {
      const results = await rewriteBatch(batch);

      // Sonuçları eşleştir
      batch.forEach(entry => {
        const match = results.find(r =>
          r.word && (
            r.word === entry.word ||
            r.word === (entry.displayWord || entry.word) ||
            r.word.replace(/\s+/g, "") === entry.word
          )
        );
        progress.done[entry.word] = match
          ? { gameDefinition: match.gameDefinition, flashHint: match.flashHint }
          : null; // başarısız → orijinal kalsın
      });

      console.log("✓");
      saved++;

      // Her 10 batch'te kaydet
      if (saved % 10 === 0) {
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

  // Son kayıt
  fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));

  // DB'ye uygula
  console.log("\nDB güncelleniyor...");
  let updated = 0, skippedNull = 0;

  const newDb = db.map(entry => {
    if (entry.skip) return entry;
    const result = progress.done[entry.word];
    if (!result) { skippedNull++; return entry; }

    updated++;
    return {
      ...entry,
      gameDefinition: result.gameDefinition || entry.gameDefinition,
      flashHint:      result.flashHint      || entry.flashHint,
    };
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(newDb, null, 2));

  console.log(`\n✅ Tamamlandı!`);
  console.log(`Güncellenen  : ${updated}`);
  console.log(`Atılan (null): ${skippedNull}`);
  console.log(`DB toplam    : ${newDb.length}`);

  if (fs.existsSync(PROGRESS)) fs.unlinkSync(PROGRESS);
}

main().catch(err => { console.error(err); process.exit(1); });
