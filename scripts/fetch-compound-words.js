/**
 * fetch-compound-words.js
 *
 * 1. TDK autocomplete'ten iki kelimeli isim tamlamalarını çeker
 * 2. TDK sözlüğünden tanımlarını alır
 * 3. Claude ile gameDefinition + flashHint üretir
 * 4. Mevcut questions-db.json'a ekleyip yeni DB kaydeder
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/fetch-compound-words.js
 *
 * Outputs:
 *   src/data/questions-db.json          (güncellendi, yeni girişler eklendi)
 *   scripts/.compound-progress.json     (checkpoint)
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY env var eksik'); process.exit(1); }

const TDK_API       = 'https://sozluk.gov.tr/gts?ara=';
const AUTO_URL      = 'https://sozluk.gov.tr/autocomplete.json';
const DB_PATH       = path.join(__dirname, '../src/data/questions-db.json');
const PROGRESS_PATH = path.join(__dirname, '.compound-progress.json');

const TDK_DELAY    = 400;
const CLAUDE_DELAY = 1200;
const BATCH_SIZE   = 12;
const MAX_RETRIES  = 3;
const TARGET_PER_LENGTH = 150; // her harf uzunluğu için hedef

// Fiil ekleri ve kalıpları — bu ile biten ikinci kelimeler çıkarılır
const VERB_ENDINGS = /(?:mek|mak|nak|yek)$/i;
// Sadece gerçek Türkçe harfler
const CLEAN_RE = /^[a-zA-ZçÇğĞıİöÖşŞüÜ ]+$/;

// ── FEW-SHOT ÖRNEKLER ──────────────────────────────────────────────────────
const STYLE_EXAMPLES = [
  { word: "acı badem",    gameDefinition: "Kabuğu sert, içi hafif acımsı küçük yağlı tohum",      flashHint: "iki kelime · kuruyemiş türü"        },
  { word: "kara delik",   gameDefinition: "Işığı bile yutacak kadar güçlü çekim alanı olan uzay cismi", flashHint: "iki kelime · uzay gizemi"      },
  { word: "demir yolu",   gameDefinition: "Raylar üzerinde ilerleyen toplu taşıma altyapısı",      flashHint: "iki kelime · tren güzergahı"        },
  { word: "göz bebeği",   gameDefinition: "Işığın gözden içeri girdiği küçük siyah nokta",         flashHint: "iki kelime · gözün ortası"          },
  { word: "bal kabağı",   gameDefinition: "Turuncu, iri, tatlımsı bir sonbahar sebzesi",           flashHint: "iki kelime · balkabağı çorbası"     },
  { word: "aslan payı",   gameDefinition: "Topluluktaki en büyük ve değerli kesim",                 flashHint: "iki kelime · en büyük hisse"        },
  { word: "gemi azısı",   gameDefinition: "Her işe girip çıkan, kontrolsüz kişi",                  flashHint: "iki kelime · denizcilik deyimi"     },
  { word: "taş bebek",    gameDefinition: "Çok güzel, mükemmel görünümlü anlamındaki övgü sözü",   flashHint: "iki kelime · iltifat ifadesi"       },
  { word: "ince bağırsak", gameDefinition: "Sindirim sisteminin en uzun ve kıvrımlı bölümü",       flashHint: "iki kelime · mide sonrası organ"    },
  { word: "sivri uçlu",   gameDefinition: "Ucu keskin ve dar gelen biçimli",                       flashHint: "iki kelime · şekil tanımı"          },
];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function letterCount(w) { return w.replace(/ /g, '').length; }

function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  return { fetched: [], skipped: [], enriched: [] };
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p)); }

// ── TDK ────────────────────────────────────────────────────────────────────

async function fetchAutoComplete() {
  const res = await fetch(AUTO_URL, { headers: { 'User-Agent': 'Dagarcik/1.0' } });
  return res.json();
}

async function fetchTDK(phrase, retries = 0) {
  try {
    const res = await fetch(TDK_API + encodeURIComponent(phrase), {
      headers: { 'User-Agent': 'Dagarcik/1.0' },
    });
    const data = await res.json();
    if (!data?.[0]?.anlamlarListe) return null;

    const entry = data[0];
    const meaning = entry.anlamlarListe[0];
    const anlam = meaning?.anlam || '';

    if (anlam.length < 10) return null;
    if (/bakınız|►|bkz\./i.test(anlam)) return null;

    // Kökeni normalize et
    const rawOrigin = entry.lisan || '';
    const originMatch = rawOrigin.match(/^(Arapça|Farsça|Fransızca|İtalyanca|İngilizce|Almanca|Rumca|Yunanca)/i);
    const origin = originMatch ? originMatch[1] : rawOrigin.split(' ')[0];

    const category = meaning.ozelliklerListe?.[0]?.tam_adi || '';

    const wordNoSpace = phrase.replace(/ /g, '');
    return {
      word: wordNoSpace,          // boşluksuz — tile & cevap kontrolü için
      displayWord: phrase,        // boşluklu — sonuç ekranı gösterimi için
      length: wordNoSpace.length,
      wordCount: 2,
      definition: anlam,
      origin,
      category,
      example: meaning.orneklerListe?.[0]?.ornek || '',
      difficulty: 'medium',
      gameDefinition: '',
      flashHint: '',
      themeCategory: 'Genel',
    };
  } catch {
    if (retries < 2) { await delay(1000); return fetchTDK(phrase, retries + 1); }
    return null;
  }
}

// ── CLAUDE ─────────────────────────────────────────────────────────────────

async function enrichBatch(batch, retryCount = 0) {
  const wordList = batch.map(q => {
    const origin = q.origin ? ` (${q.origin})` : '';
    return `${q.word}${origin}: ${q.definition}`;
  }).join('\n');

  const fewShot = STYLE_EXAMPLES.slice(0, 8).map(e =>
    `  {"word":"${e.word}","gameDefinition":"${e.gameDefinition}","flashHint":"${e.flashHint}"}`
  ).join(',\n');

  const prompt = `Sen bir Türkçe kelime oyunu editörüsün. Aşağıdaki İKİ KELİMELİ ifadeler için oyun tanımı yazacaksın.

Kurallar:
1. gameDefinition: 10-70 karakter, ifadenin kendisini kullanma, çarpıcı ve akılda kalıcı yaz
2. flashHint: "iki kelime · " ile başlasın, ardından 2-4 kelimelik bağlam ipucu

ÖRNEK ÇIKTI:
[
${fewShot}
]

YAZILACAKLAR:
${wordList}

SADECE JSON ARRAY döndür: [{"word":"...","gameDefinition":"...","flashHint":"..."}]`;

  const bodyBuf = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 2500,
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
      return enrichBatch(batch, retryCount + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  let text = data.content?.[0]?.text?.trim() || '';
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(text);
  } catch {
    if (retryCount < MAX_RETRIES) { await delay(2000); return enrichBatch(batch, retryCount + 1); }
    return null;
  }
}

// ── ANA ─────────────────────────────────────────────────────────────────────

const CLAUDE_ONLY = process.argv.includes('--claude-only');

async function main() {
  // 1. Mevcut DB'yi yükle — duplicate kontrolü için
  const existingDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const existingWords = new Set(existingDB.map(e => e.word.toLowerCase()));

  const progress = loadProgress();
  const fetchedWords = new Set(progress.fetched.map(e => e.word?.toLowerCase()));
  const skippedWords = new Set(progress.skipped);

  console.log(`Mevcut DB: ${existingDB.length} kelime`);
  console.log(`Checkpoint: ${progress.fetched.length} çekildi, ${skippedWords.size} atlandı\n`);

  let tdkFetched = [...progress.fetched];

  if (CLAUDE_ONLY) {
    console.log('--claude-only: TDK adımı atlanıyor, checkpoint kullanılıyor.\n');
  } else {
  // 2. Autocomplete'ten iki kelimeli isim tamlamalarını filtrele
  console.log('TDK autocomplete indiriliyor...');
  const autoData = await fetchAutoComplete();
  const allPhrases = autoData
    .map(d => (d.madde || d))
    .filter(w => typeof w === 'string')
    .filter(w => {
      const parts = w.split(' ');
      if (parts.length !== 2) return false;
      if (!CLEAN_RE.test(w)) return false;
      if (VERB_ENDINGS.test(parts[1])) return false;  // fiil sonu
      const lc = letterCount(w);
      return lc >= 8 && lc <= 14;
    })
    .filter(w => !existingWords.has(w.toLowerCase()))
    .filter(w => !fetchedWords.has(w.toLowerCase()))
    .filter(w => !skippedWords.has(w.toLowerCase()));

  // Uzunluğa göre dengeli seçim
  const candidates = [];
  for (let l = 8; l <= 14; l++) {
    const group = allPhrases
      .filter(w => letterCount(w) === l)
      .sort(() => Math.random() - 0.5)
      .slice(0, TARGET_PER_LENGTH);
    candidates.push(...group);
  }

  console.log(`Aday iki kelimeli ifade: ${candidates.length} (${TARGET_PER_LENGTH}/uzunluk hedef)\n`);

  // 3. TDK'dan tanım çek
  let tCount = 0;
  for (const phrase of candidates) {
    tCount++;
    process.stdout.write(`TDK [${tCount}/${candidates.length}] ${phrase}... `);
    const entry = await fetchTDK(phrase);
    if (entry) {
      tdkFetched.push(entry);
      console.log('✓');
    } else {
      progress.skipped.push(phrase);
      console.log('–');
    }
    if (tCount % 50 === 0) saveProgress({ ...progress, fetched: tdkFetched });
    await delay(TDK_DELAY);
  }

  saveProgress({ ...progress, fetched: tdkFetched });
  console.log(`\nTDK'dan çekilen: ${tdkFetched.length}\n`);
  } // end else (CLAUDE_ONLY)

  console.log(`Checkpoint'te toplam: ${tdkFetched.length} giriş\n`);

  // 4. Claude ile gameDefinition + flashHint üret
  const needsEnrich = tdkFetched.filter(e => !e.gameDefinition);
  console.log(`Claude zenginleştirme: ${needsEnrich.length} ifade\n`);

  const enrichedMap = {};
  progress.enriched.forEach(e => { enrichedMap[e.word] = e; });

  const totalBatches = Math.ceil(needsEnrich.length / BATCH_SIZE);
  for (let i = 0; i < needsEnrich.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = needsEnrich.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Claude ${batchNum}/${totalBatches} (${batch.map(e => e.word).join(', ').substring(0, 50)})... `);

    const results = await enrichBatch(batch);
    if (results) {
      for (const orig of batch) {
        const match = results.find(r => r.word?.toLowerCase() === orig.word.toLowerCase());
        if (match?.gameDefinition) {
          enrichedMap[orig.word] = { ...orig, gameDefinition: match.gameDefinition, flashHint: match.flashHint || '' };
        } else {
          enrichedMap[orig.word] = { ...orig, gameDefinition: orig.definition.substring(0, 70), flashHint: 'iki kelime' };
        }
      }
      console.log('✓');
    } else {
      for (const orig of batch) {
        enrichedMap[orig.word] = { ...orig, gameDefinition: orig.definition.substring(0, 70), flashHint: 'iki kelime' };
      }
      console.log('✗');
    }

    if (batchNum % 5 === 0) {
      saveProgress({ ...progress, fetched: tdkFetched, enriched: Object.values(enrichedMap) });
    }
    await delay(CLAUDE_DELAY);
  }

  // 5. Mevcut DB'ye ekle ve kaydet
  const newEntries = Object.values(enrichedMap).filter(e => !existingWords.has(e.word.toLowerCase()));
  const updatedDB = [...existingDB, ...newEntries];
  fs.writeFileSync(DB_PATH, JSON.stringify(updatedDB));

  saveProgress({ ...progress, fetched: tdkFetched, enriched: Object.values(enrichedMap) });

  console.log('\n=== TAMAMLANDI ===');
  console.log(`Eklenen yeni giriş: ${newEntries.length}`);
  console.log(`Toplam DB boyutu: ${updatedDB.length}`);

  // Uzunluk dağılımı
  const dist = {};
  newEntries.forEach(e => { dist[e.length] = (dist[e.length] || 0) + 1; });
  console.log('Uzunluk dağılımı:', Object.entries(dist).sort((a,b) => +a[0] - +b[0]).map(([l,c]) => `${l}h:${c}`).join(' '));
}

main().catch(err => { console.error('Hata:', err.message); process.exit(1); });
