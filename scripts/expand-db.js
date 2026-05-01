/**
 * expand-db.js
 *
 * Mevcut DB'deki tek kelime havuzunu genişletir.
 * TDK autocomplete → tanım çek → Claude ile zenginleştir → DB'ye ekle.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/expand-db.js
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/expand-db.js --claude-only
 *
 * Outputs:
 *   src/data/questions-db.json       (güncellendi)
 *   scripts/.expand-progress.json    (checkpoint)
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY env var eksik'); process.exit(1); }

const TDK_API       = 'https://sozluk.gov.tr/gts?ara=';
const AUTO_URL      = 'https://sozluk.gov.tr/autocomplete.json';
const DB_PATH       = path.join(__dirname, '../src/data/questions-db.json');
const PROGRESS_PATH = path.join(__dirname, '.expand-progress.json');

const TDK_DELAY    = 350;
const CLAUDE_DELAY = 1200;
const BATCH_SIZE   = 15;
const MAX_RETRIES  = 3;
const TARGET_PER_LENGTH = 2000; // hedef: her uzunlukta bu kadar kelime

const CLAUDE_ONLY = process.argv.includes('--claude-only');

// Sadece Türkçe harfler, boşluk yok
const SINGLE_WORD_RE = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

// ── FEW-SHOT ÖRNEKLER ──────────────────────────────────────────────────────
const STYLE_EXAMPLES = [
  { word: "kalem",   gameDefinition: "Yazı yazmak için elde tutulan ince araç",                 flashHint: "öğrencinin vazgeçilmezi"      },
  { word: "serçe",   gameDefinition: "Küçük, hızlı ve şehirlerde sıkça görülen bir ötücü kuş", flashHint: "dal dal atlayan küçük kuş"    },
  { word: "cesaret", gameDefinition: "Tehlikeye rağmen harekete geçme gücü",                   flashHint: "korku karşısındaki irade"      },
  { word: "türkü",   gameDefinition: "Halk müziğinin sözlü, ezgili ürünü",                     flashHint: "Anadolu'nun ezgili sesi"       },
  { word: "hisar",   gameDefinition: "Düşmana karşı korunmak için yapılmış taş surlu kale",    flashHint: "eski savaş yapısı"            },
  { word: "hamur",   gameDefinition: "Un ve su karıştırılarak yoğrulan pişmemiş madde",         flashHint: "ekmeğin ham hali"             },
  { word: "özlem",   gameDefinition: "Uzakta olana duyulan derin eksiklik hissi",               flashHint: "uzak ve sevilen düşünce"      },
  { word: "mercan",  gameDefinition: "Deniz dibinde yavaşça büyüyen, kırmızı renkli iskelet",  flashHint: "okyanus katedrali"            },
  { word: "lonca",   gameDefinition: "Osmanlı döneminde esnaf ve zanaatkarların birliği",       flashHint: "Osmanlı meslek birliği"       },
  { word: "çorba",   gameDefinition: "Sebze ya da et suyu ile pişirilen sıvı yemek",           flashHint: "soğuk günlerin sıcak tabağı"  },
  { word: "destan",  gameDefinition: "Olağanüstü kahramanlıkları anlatan uzun halk anlatısı",  flashHint: "kahramanlık kokan uzun şiir"  },
  { word: "asit",    gameDefinition: "pH değeri 7'nin altında kalan yakıcı kimyasal madde",    flashHint: "limonun kimyasal tarafı"      },
];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  return { fetched: [], skipped: [] };
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p)); }

// ── TDK ────────────────────────────────────────────────────────────────────

async function fetchAutoComplete() {
  const res = await fetch(AUTO_URL, { headers: { 'User-Agent': 'Dagarcik/1.0' } });
  return res.json();
}

async function fetchTDK(word, retries = 0) {
  try {
    const res = await fetch(TDK_API + encodeURIComponent(word), {
      headers: { 'User-Agent': 'Dagarcik/1.0' },
    });
    const data = await res.json();
    if (!data?.[0]?.anlamlarListe) return null;

    const entry = data[0];
    const meaning = entry.anlamlarListe[0];
    const anlam = meaning?.anlam || '';

    if (anlam.length < 12) return null;
    if (/bakınız|►|bkz\./i.test(anlam)) return null;

    const rawOrigin = entry.lisan || '';
    const originMatch = rawOrigin.match(/^(Arapça|Farsça|Fransızca|İtalyanca|İngilizce|Almanca|Rumca|Yunanca)/i);
    const origin = originMatch ? originMatch[1] : rawOrigin.split(' ')[0];
    const category = meaning.ozelliklerListe?.[0]?.tam_adi || '';

    // Zorluk tahmini: uzun kelime veya nadir köken → hard
    const len = word.length;
    const difficulty = len <= 5 ? 'easy' : len <= 7 ? 'medium' : 'hard';

    return {
      word,
      length: len,
      definition: anlam,
      origin,
      category,
      example: meaning.orneklerListe?.[0]?.ornek || '',
      difficulty,
      gameDefinition: '',
      flashHint: '',
      themeCategory: 'Genel',
    };
  } catch {
    if (retries < 2) { await delay(1000); return fetchTDK(word, retries + 1); }
    return null;
  }
}

// ── CLAUDE ─────────────────────────────────────────────────────────────────

async function enrichBatch(batch, retryCount = 0) {
  const wordList = batch.map(q => {
    const origin = q.origin ? ` (${q.origin})` : '';
    return `${q.word}${origin}: ${q.definition}`;
  }).join('\n');

  const fewShot = STYLE_EXAMPLES.map(e =>
    `  {"word":"${e.word}","gameDefinition":"${e.gameDefinition}","flashHint":"${e.flashHint}","difficulty":"easy","skip":false}`
  ).join(',\n');

  const prompt = `Sen bir Türkçe kelime oyunu editörüsün. Her kelime için dört alan yazacaksın:

1. gameDefinition: 10-65 karakter, kelimenin kendisini kullanma, sade ve çarpıcı yaz
2. flashHint: 2-5 kelimelik bağlam ipucu, cevabı açıkça verme
3. difficulty: Kelimenin ne kadar yaygın/bilinen olduğuna göre:
   - "easy": İlkokul çocuğunun bile bildiği günlük kelime (masa, elma, gülmek)
   - "medium": Eğitimli yetişkinin rahatlıkla bildiği kelime (cümle, önerge, sevinç)
   - "hard": Nadir kullanılan, teknik veya arkaik kelime (mürekkep baskısı türleri, eski hukuk terimleri vb.)
4. skip: true veya false — Kelime çok nadir/arkaik/teknik ve sıradan bir oyuncunun hiç duymamış olması kuvvetle muhtemelse TRUE yaz. Aksi halde FALSE.

ÖRNEK:
[
${fewShot}
]

YAZILACAKLAR:
${wordList}

SADECE JSON ARRAY döndür: [{"word":"...","gameDefinition":"...","flashHint":"...","difficulty":"easy/medium/hard","skip":false}]`;

  const bodyBuf = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 3000,
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

async function main() {
  const existingDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const existingWords = new Set(existingDB.map(e => e.word.toLowerCase()));

  const progress = loadProgress();
  const fetchedWords = new Set(progress.fetched.map(e => e.word?.toLowerCase()));
  const skippedWords = new Set(progress.skipped);

  // Uzunluk başına mevcut tek kelime sayısı
  const currentCounts = {};
  for (let l = 4; l <= 10; l++) currentCounts[l] = 0;
  existingDB.forEach(e => {
    if (!e.wordCount && e.length >= 4 && e.length <= 10) {
      currentCounts[e.length] = (currentCounts[e.length] || 0) + 1;
    }
  });

  console.log(`Mevcut DB: ${existingDB.length} toplam`);
  console.log('Tek kelime dağılımı:', Object.entries(currentCounts).map(([l,c])=>`${l}h:${c}`).join(' '));
  console.log(`Checkpoint: ${progress.fetched.length} çekildi, ${skippedWords.size} atlandı\n`);

  let tdkFetched = [...progress.fetched];

  if (CLAUDE_ONLY) {
    console.log('--claude-only: TDK adımı atlanıyor.\n');
  } else {
    console.log('TDK autocomplete indiriliyor...');
    const autoData = await fetchAutoComplete();

    const candidates = [];
    for (let l = 4; l <= 10; l++) {
      const need = Math.max(0, TARGET_PER_LENGTH - currentCounts[l]);
      if (need === 0) { console.log(`${l}h: hedef doldu, atlanıyor`); continue; }

      const group = autoData
        .map(d => d.madde || d)
        .filter(w => typeof w === 'string' && SINGLE_WORD_RE.test(w) && w.length === l)
        .filter(w => !existingWords.has(w.toLowerCase()))
        .filter(w => !fetchedWords.has(w.toLowerCase()))
        .filter(w => !skippedWords.has(w.toLowerCase()))
        .sort(() => Math.random() - 0.5)
        .slice(0, need + 200); // biraz fazla al, TDK'dan dönmeyenler olacak

      candidates.push(...group);
      console.log(`${l}h: ${need} eksik, ${group.length} aday`);
    }

    console.log(`\nToplam aday: ${candidates.length}\n`);

    let tCount = 0;
    for (const word of candidates) {
      tCount++;
      process.stdout.write(`TDK [${tCount}/${candidates.length}] ${word}... `);
      const entry = await fetchTDK(word);
      if (entry) {
        tdkFetched.push(entry);
        console.log('✓');
      } else {
        progress.skipped.push(word);
        console.log('–');
      }
      if (tCount % 100 === 0) saveProgress({ ...progress, fetched: tdkFetched });
      await delay(TDK_DELAY);
    }

    saveProgress({ ...progress, fetched: tdkFetched });
    console.log(`\nTDK'dan çekilen toplam: ${tdkFetched.length}\n`);
  }

  // Claude zenginleştirme
  const needsEnrich = tdkFetched.filter(e => !e.gameDefinition);
  console.log(`Claude zenginleştirme: ${needsEnrich.length} kelime\n`);

  const enrichedMap = {};
  const totalBatches = Math.ceil(needsEnrich.length / BATCH_SIZE);

  for (let i = 0; i < needsEnrich.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = needsEnrich.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Claude ${batchNum}/${totalBatches} (${batch.map(e=>e.word).join(', ').substring(0,50)})... `);

    const results = await enrichBatch(batch);
    let skippedCount = 0;
    if (results) {
      for (const orig of batch) {
        const match = results.find(r => r.word?.toLowerCase() === orig.word.toLowerCase());
        if (match?.skip === true) {
          skippedCount++;
          process.stdout.write(`\n    ⊘ ${orig.word}`);
          enrichedMap[orig.word] = null; // işaretli — DB'ye eklenmeyecek
        } else if (match?.gameDefinition) {
          enrichedMap[orig.word] = {
            ...orig,
            gameDefinition: match.gameDefinition.trim(),
            flashHint: (match.flashHint || '').trim(),
            difficulty: match.difficulty || orig.difficulty,
          };
        } else {
          enrichedMap[orig.word] = { ...orig, gameDefinition: orig.definition.substring(0, 65), flashHint: '' };
        }
      }
      console.log(`✓${skippedCount > 0 ? ` (${skippedCount} atlandı)` : ''}`);
    } else {
      for (const orig of batch) {
        enrichedMap[orig.word] = { ...orig, gameDefinition: orig.definition.substring(0, 65), flashHint: '' };
      }
      console.log('✗');
    }

    if (batchNum % 5 === 0) {
      saveProgress({ ...progress, fetched: tdkFetched.map(e => enrichedMap[e.word] || e) });
    }
    await delay(CLAUDE_DELAY);
  }

  // DB'ye ekle (skip:true olanlar null — filtrele)
  const newEntries = Object.values(enrichedMap).filter(e => e !== null && !existingWords.has(e.word.toLowerCase()));
  const updatedDB = [...existingDB, ...newEntries];
  fs.writeFileSync(DB_PATH, JSON.stringify(updatedDB));

  console.log('\n=== TAMAMLANDI ===');
  console.log(`Eklenen: ${newEntries.length}`);
  console.log(`Toplam DB: ${updatedDB.length}`);

  const dist = {};
  updatedDB.filter(e => !e.wordCount).forEach(e => { dist[e.length] = (dist[e.length]||0)+1; });
  console.log('Tek kelime dağılımı:', Object.entries(dist).sort((a,b)=>+a[0]-+b[0]).map(([l,c])=>`${l}h:${c}`).join(' '));
}

main().catch(err => { console.error('Hata:', err.message); process.exit(1); });
