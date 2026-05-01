/**
 * improve-questions.js
 *
 * Rewrites gameDefinition + flashHint for every entry in questions-db.json
 * using claude-haiku-4-5 with few-shot style examples.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/improve-questions.js
 *
 * Outputs:
 *   src/data/questions-db-improved.json   (final result)
 *   scripts/.improve-progress.json        (checkpoint — delete to restart)
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY env var eksik'); process.exit(1); }

const DB_PATH      = path.join(__dirname, '../src/data/questions-db.json');
const OUT_PATH     = path.join(__dirname, '../src/data/questions-db-improved.json');
const PROGRESS_PATH = path.join(__dirname, '.improve-progress.json');

const BATCH_SIZE   = 15;   // kelime / istek
const DELAY_MS     = 1200; // istek arası bekleme (rate limit için)
const MAX_RETRIES  = 3;

// ── FEW-SHOT ÖRNEKLER ──────────────────────────────────────────────────────
// Bu örnekler istenen kalite stilini gösterir.
// "gameDefinition": çarpıcı, kısa (10-60 karakter), kelimeyi kullanmadan
// "flashHint": kategori/bağlam ipucu, cevabı ele vermeden (2-5 kelime)
const STYLE_EXAMPLES = [
  // ── Somut nesneler ──
  { word: "kalem",   gameDefinition: "Yazı yazmak için elde tutulan ince araç",                flashHint: "öğrencinin vazgeçilmezi"           },
  { word: "ayna",    gameDefinition: "Yüzünüzü görmenizi sağlayan yansıtıcı yüzey",           flashHint: "sabah ilk baktığımız yer"          },
  { word: "mum",     gameDefinition: "Işık vererek yanan, balmumundan yapılan çubuk",          flashHint: "karanlıkta dost"                   },
  { word: "halı",    gameDefinition: "Yere serilen, renkli dokumadan yapılan döşeme",          flashHint: "ayakların altındaki sanat"         },
  { word: "çanak",  gameDefinition: "Yemek ya da içecek koymak için kullanılan derin kap",    flashHint: "sofranın temel kabı"               },
  // ── Doğa / hayvanlar ──
  { word: "serçe",  gameDefinition: "Küçük, hızlı ve şehirlerde sıkça görülen bir ötücü kuş", flashHint: "dal dal atlayan küçük kuş"        },
  { word: "meşe",   gameDefinition: "Palamuduyla ünlü, yüzyıllar yaşayan meyveli orman ağacı",flashHint: "palamut veren güçlü ağaç"          },
  { word: "çimen",  gameDefinition: "Toprak yüzeyini örten ince yeşil bitki örtüsü",           flashHint: "parkların yeşil halısı"            },
  { word: "mercan", gameDefinition: "Deniz dibinde yavaşça büyüyen, kırmızı renkli iskelet",  flashHint: "okyanus katedrali"                 },
  // ── Soyut / kavram ──
  { word: "cesaret", gameDefinition: "Tehlikeye rağmen harekete geçme gücü",                  flashHint: "korku karşısındaki irade"          },
  { word: "özlem",   gameDefinition: "Uzakta olana duyulan derin eksiklik hissi",             flashHint: "uzak ve sevilen düşünce"           },
  { word: "hüzün",   gameDefinition: "İçi burkan, ağır bir keder duygusu",                    flashHint: "yüreği sıkan his"                  },
  { word: "sabır",   gameDefinition: "Zorluğu sessizce göğüsleme erdemi",                     flashHint: "beklemenin erdem hali"             },
  // ── Sanat / kültür ──
  { word: "türkü",  gameDefinition: "Halk müziğinin sözlü, ezgili ürünü",                     flashHint: "Anadolu'nun ezgili sesi"           },
  { word: "destan", gameDefinition: "Olağanüstü kahramanlıkları anlatan uzun halk anlatısı",  flashHint: "kahramanlık kokan uzun şiir"       },
  { word: "kilim",  gameDefinition: "Düz dokuma tekniğiyle yapılan, desensiz halı türü",      flashHint: "duvar ya da yer süsü"              },
  { word: "çini",   gameDefinition: "Fırınlanmış, sırlı ve boyalı seramik karo",              flashHint: "camilerin renkli süsü"             },
  // ── Meslekler / bilim ──
  { word: "torba",  gameDefinition: "Içine bir şey konularak taşınan beze ya da plastik kap", flashHint: "marketteki alışveriş arkadaşı"     },
  { word: "bağlaç", gameDefinition: "Sözcük ve cümleleri birbirine bağlayan dil birimi",      flashHint: "cümleyi birleştiren dilbilgisi ögesi" },
  { word: "asit",   gameDefinition: "pH değeri 7'nin altında kalan yakıcı kimyasal madde",    flashHint: "limonun kimyasal tarafı"           },
  // ── Tarih / toplum ──
  { word: "hisar",  gameDefinition: "Düşmana karşı korunmak için yapılmış taş surlu kale",   flashHint: "eski savaş yapısı kale"            },
  { word: "lonca",  gameDefinition: "Osmanlı döneminde esnaf ve zanaatkarların birliği",      flashHint: "Osmanlı meslek birliği"            },
  { word: "isyan",  gameDefinition: "Otoriteye karşı açık ve toplu başkaldırı",               flashHint: "sisteme başkaldırı"                },
  // ── Yemek ──
  { word: "hamur",  gameDefinition: "Un ve su karıştırılarak yoğrulan pişmemiş madde",        flashHint: "ekmeğin ham hali"                  },
  { word: "çorba",  gameDefinition: "Sebze ya da et suyu ile pişirilen sıvı yemek",           flashHint: "soğuk günlerin sıcak tabağı"       },
];

// ── YARDIMCI FONKSİYONLAR ──────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  }
  return { processedIndices: [], results: {} };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
}

function buildFewShotBlock() {
  return STYLE_EXAMPLES.slice(0, 12).map(e =>
    `  {"word":"${e.word}","gameDefinition":"${e.gameDefinition}","flashHint":"${e.flashHint}"}`
  ).join(',\n');
}

async function improveBatch(batch, retryCount = 0) {
  const wordList = batch.map(q => {
    const origin = q.origin ? ` (${q.origin})` : '';
    return `${q.word}${origin}: ${q.definition}`;
  }).join('\n');

  const fewShot = buildFewShotBlock();

  const prompt = `Sen bir Türkçe kelime oyunu editörüsün. Her kelime için iki alan yazacaksın:

1. gameDefinition: Oyunda gösterilecek ipucu cümle.
   - Kelimenin kendisini ASLA kullanma
   - 10-65 karakter arası
   - Sade, akılda kalıcı, biraz çarpıcı/şiirsel ol
   - Sözlük tanımını kopyalama; kendi kelimelerinle yaz
   - "-cı/-ci/-lık/-lik yapan kişi" gibi kalıplardan kaç
   - Türkçe kök/köken ipucu ekleyebilirsin

2. flashHint: 2-5 kelimelik ufak ipucu.
   - Kategori ya da bağlam ver
   - Cevabı açıkça verme
   - Ezbere kalıplardan kaç ("Türkçe sözcük", "bir isim" gibi)

ÖRNEK ÇIKTI (format tam böyle olmalı):
[
${fewShot}
]

ŞİMDİ YAZILACAKLAR:
${wordList}

SADECE JSON ARRAY döndür, başka hiçbir şey yazma. Her eleman: {"word":"kelime","gameDefinition":"...","flashHint":"..."}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 529 || res.status === 429) {
      // overloaded / rate limited — back off
      const wait = (retryCount + 1) * 5000;
      console.log(`  ⚠ ${res.status} — ${wait/1000}s bekleniyor...`);
      await delay(wait);
      if (retryCount < MAX_RETRIES) return improveBatch(batch, retryCount + 1);
    }
    throw new Error(`HTTP ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  if (!data.content?.[0]?.text) {
    console.error('  Boş yanıt:', JSON.stringify(data).substring(0, 200));
    return null;
  }

  let text = data.content[0].text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('  JSON parse hatası:', e.message);
    console.error('  İlk 300 karakter:', text.substring(0, 300));
    if (retryCount < MAX_RETRIES) {
      console.log('  Yeniden deniyor...');
      await delay(2000);
      return improveBatch(batch, retryCount + 1);
    }
    return null;
  }
}

// ── ANA FONKSİYON ──────────────────────────────────────────────────────────

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const progress = loadProgress();

  const processedSet = new Set(progress.processedIndices);
  const results = progress.results || {};

  const remaining = db
    .map((entry, i) => ({ entry, i }))
    .filter(({ i }) => !processedSet.has(i));

  console.log(`Toplam: ${db.length} kelime`);
  console.log(`Tamamlanan: ${processedSet.size}`);
  console.log(`Kalan: ${remaining.length}`);
  console.log(`Batch boyutu: ${BATCH_SIZE}`);
  console.log(`Tahmini süre: ~${Math.ceil(remaining.length / BATCH_SIZE * (DELAY_MS + 2000) / 60000)} dakika\n`);

  let batchNum = 0;
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    batchNum++;
    const slice = remaining.slice(i, i + BATCH_SIZE);
    const batch = slice.map(s => s.entry);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.map(e => e.word).join(', ').substring(0, 60)}...)  `);

    const improved = await improveBatch(batch);

    if (improved && Array.isArray(improved)) {
      for (const { entry, i: origIdx } of slice) {
        const match = improved.find(r => r.word?.toLowerCase() === entry.word.toLowerCase());
        if (match?.gameDefinition) {
          results[origIdx] = {
            gameDefinition: match.gameDefinition.trim(),
            flashHint: (match.flashHint || '').trim(),
          };
        } else {
          results[origIdx] = {
            gameDefinition: entry.gameDefinition || entry.definition,
            flashHint: entry.flashHint || '',
          };
        }
        processedSet.add(origIdx);
      }
      console.log('✓');
    } else {
      for (const { entry, i: origIdx } of slice) {
        results[origIdx] = {
          gameDefinition: entry.gameDefinition || entry.definition,
          flashHint: entry.flashHint || '',
        };
        processedSet.add(origIdx);
      }
      console.log('✗ (orijinal kullanıldı)');
    }

    // Her 5 batch'te bir checkpoint kaydet
    if (batchNum % 5 === 0) {
      saveProgress({ processedIndices: [...processedSet], results });
      // Ara çıktı da kaydet
      const interim = db.map((entry, idx) => ({
        ...entry,
        gameDefinition: results[idx]?.gameDefinition ?? entry.gameDefinition ?? entry.definition,
        flashHint: results[idx]?.flashHint ?? entry.flashHint ?? '',
      }));
      fs.writeFileSync(OUT_PATH, JSON.stringify(interim));
      process.stdout.write(`  [checkpoint kaydedildi — ${processedSet.size}/${db.length}]\n`);
    }

    if (i + BATCH_SIZE < remaining.length) {
      await delay(DELAY_MS);
    }
  }

  // Son kayıt
  saveProgress({ processedIndices: [...processedSet], results });

  const final = db.map((entry, idx) => ({
    ...entry,
    gameDefinition: results[idx]?.gameDefinition ?? entry.gameDefinition ?? entry.definition,
    flashHint: results[idx]?.flashHint ?? entry.flashHint ?? '',
  }));

  fs.writeFileSync(OUT_PATH, JSON.stringify(final));

  const improved = Object.values(results).filter(r => r.gameDefinition).length;
  console.log('\n=== TAMAMLANDI ===');
  console.log(`İşlenen: ${processedSet.size}/${db.length}`);
  console.log(`İyileştirilen: ${improved}`);
  console.log(`Çıktı: ${OUT_PATH}`);
  console.log('\nMemnunsan eski DB\'yi yedekle ve yenisiyle değiştir:');
  console.log('  cp src/data/questions-db.json src/data/questions-db-backup.json');
  console.log('  cp src/data/questions-db-improved.json src/data/questions-db.json');
}

main().catch(err => {
  console.error('\nHata:', err.message);
  process.exit(1);
});
