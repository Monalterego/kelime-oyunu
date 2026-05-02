/**
 * categorize-db.js
 *
 * themeCategory alanı "Genel" olan tüm girişleri Claude ile sınıflandırır.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/categorize-db.js
 *
 * Checkpoint: scripts/.categorize-progress.json
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY env var eksik'); process.exit(1); }

const DB_PATH       = path.join(__dirname, '../src/data/questions-db.json');
const PROGRESS_PATH = path.join(__dirname, '.categorize-progress.json');
const BATCH_SIZE    = 25;
const DELAY_MS      = 1000;
const MAX_RETRIES   = 3;

const CATEGORIES = [
  'Gunluk Hayat',
  'Tarih ve Toplum',
  'Bilim ve Teknoloji',
  'Meslekler',
  'Sanat ve Kultur',
  'Doga ve Hayvanlar',
  'Spor ve Saglik',
  'Yemek ve Mutfak',
  'Genel',
];

const EXAMPLES = [
  { word: 'tahta',    themeCategory: 'Gunluk Hayat'      },
  { word: 'osmanlı',  themeCategory: 'Tarih ve Toplum'   },
  { word: 'elektron', themeCategory: 'Bilim ve Teknoloji'},
  { word: 'marangoz', themeCategory: 'Meslekler'         },
  { word: 'heykel',   themeCategory: 'Sanat ve Kultur'   },
  { word: 'sincap',   themeCategory: 'Doga ve Hayvanlar' },
  { word: 'halter',   themeCategory: 'Spor ve Saglik'    },
  { word: 'baklava',  themeCategory: 'Yemek ve Mutfak'   },
  { word: 'özgürlük', themeCategory: 'Genel'             },
];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  return { done: {} };
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p)); }

async function categorizeBatch(batch, retryCount = 0) {
  const wordList = batch.map(e => `${e.word}: ${e.gameDefinition || e.definition}`).join('\n');
  const fewShot = EXAMPLES.map(e => `  {"word":"${e.word}","themeCategory":"${e.themeCategory}"}`).join(',\n');

  const prompt = `Her kelimeyi aşağıdaki kategorilerden birine ata:
${CATEGORIES.map(c => '- ' + c).join('\n')}

Kategori seçim rehberi:
- Gunluk Hayat: Ev, aile, alışveriş, ulaşım, gündelik nesneler
- Tarih ve Toplum: Tarih, siyaset, devlet, toplum, din, hukuk
- Bilim ve Teknoloji: Fen, matematik, tıp, bilgisayar, fizik, kimya
- Meslekler: İş kolları, unvanlar, zanaat, meslek isimleri
- Sanat ve Kultur: Müzik, resim, edebiyat, tiyatro, sinema, dil
- Doga ve Hayvanlar: Bitki, hayvan, coğrafya, hava, doğa olayları
- Spor ve Saglik: Spor dalları, sağlık, vücut, hastalık, egzersiz
- Yemek ve Mutfak: Yiyecek, içecek, pişirme, mutfak araçları
- Genel: Hiçbir kategoriye tam uymayan soyut kavram veya genel kelimeler

ÖRNEK:
[
${fewShot}
]

YAZILACAKLAR:
${wordList}

SADECE JSON ARRAY döndür: [{"word":"...","themeCategory":"..."}]`;

  const bodyBuf = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  }), 'utf8');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: bodyBuf,
  });

  if (!res.ok) {
    if ((res.status === 429 || res.status === 529) && retryCount < MAX_RETRIES) {
      await delay((retryCount + 1) * 5000);
      return categorizeBatch(batch, retryCount + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  let text = data.content?.[0]?.text?.trim() || '';
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(text);
  } catch {
    if (retryCount < MAX_RETRIES) { await delay(2000); return categorizeBatch(batch, retryCount + 1); }
    return null;
  }
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const progress = loadProgress();

  const needsCat = db.filter(e => e.themeCategory === 'Genel' && !progress.done[e.word]);
  console.log(`Kategorisiz giriş: ${needsCat.length}`);
  console.log(`Tahmini maliyet: ~$${(needsCat.length / BATCH_SIZE * 0.003).toFixed(2)}`);
  console.log(`Tahmini süre: ~${Math.ceil(needsCat.length / BATCH_SIZE * (DELAY_MS + 1500) / 60000)} dakika\n`);

  const totalBatches = Math.ceil(needsCat.length / BATCH_SIZE);

  for (let i = 0; i < needsCat.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = needsCat.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.map(e => e.word).join(', ').substring(0, 60)})... `);

    const results = await categorizeBatch(batch);
    if (results) {
      for (const orig of batch) {
        const match = results.find(r => r.word?.toLowerCase() === orig.word.toLowerCase());
        const cat = match?.themeCategory && CATEGORIES.includes(match.themeCategory)
          ? match.themeCategory
          : 'Genel';
        progress.done[orig.word] = cat;
      }
      console.log('✓');
    } else {
      for (const orig of batch) progress.done[orig.word] = 'Genel';
      console.log('✗');
    }

    if (batchNum % 10 === 0) saveProgress(progress);
    await delay(DELAY_MS);
  }

  saveProgress(progress);

  // DB'yi güncelle
  const updated = db.map(e => {
    if (e.themeCategory === 'Genel' && progress.done[e.word]) {
      return { ...e, themeCategory: progress.done[e.word] };
    }
    return e;
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(updated));

  // Sonuç dağılımı
  const dist = {};
  updated.forEach(e => dist[e.themeCategory] = (dist[e.themeCategory] || 0) + 1);
  console.log('\n=== TAMAMLANDI ===');
  Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(` ${k}: ${v}`));
}

main().catch(err => { console.error('Hata:', err.message); process.exit(1); });
