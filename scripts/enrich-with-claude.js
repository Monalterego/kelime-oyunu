const fs = require('fs');
const path = require('path');

const API_KEY = ''YOUR_API_KEY_HERE';
const DB_PATH = path.join(__dirname, '../src/data/questions-db.json');
const OUT_PATH = path.join(__dirname, '../src/data/questions-db-v2.json');
const BATCH_SIZE = 20;
const DELAY = 2000;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function enrichBatch(batch) {
  const wordList = batch.map(q =>
    q.word + ' | ' + q.definition + ' | ' + (q.origin || 'Turkce') + ' | ' + (q.category || 'Genel')
  ).join('\n');

  const prompt = 'Sen bir Turkce kelime oyunu icin soru editorusun. Asagidaki kelimelerin her biri icin su 3 seyi uret:\n\n1. TANIM: Oyun icin kisa, anlasilir, eglenceli bir tanim (sozluk tanimi degil, insanlarin anlayacagi sekilde). Kelimenin kendisini ASLA kullanma. 15-60 karakter arasi.\n2. ZORLUK: easy, medium veya hard (kelimenin gunluk hayatta ne kadar yaygin olduguna gore)\n3. HINT: O kelimeye ozel kisa bir ipucu cumlesi (2-6 kelime). Ornek: "Mutfaginizda muhakkak var" veya "Cocuklarin en sevdigi"\n\nKelimeler:\n' + wordList + '\n\nYANITI SADECE JSON ARRAY OLARAK VER, baska hicbir sey yazma. Her eleman: {"word":"kelime","gameDefinition":"tanim","difficulty":"easy/medium/hard","flashHint":"ipucu"}\nOrnek: [{"word":"kalem","gameDefinition":"Yazarken elde tutulan ince arac","difficulty":"easy","flashHint":"Her ogrencinin cantasinda"}]';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  if (!data.content || !data.content[0]) {
    console.error('API bos yanit:', JSON.stringify(data).substring(0, 200));
    return null;
  }

  try {
    let text = data.content[0].text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse hatasi:', e.message);
    console.error('Yanit:', data.content[0].text.substring(0, 300));
    return null;
  }
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const enriched = [];
  let processed = 0;
  let failed = 0;

  console.log('Toplam:', db.length, 'kelime');
  console.log('Batch boyutu:', BATCH_SIZE);
  console.log('Tahmini sure:', Math.ceil(db.length / BATCH_SIZE) * (DELAY/1000), 'saniye\n');

  for (let i = 0; i < db.length; i += BATCH_SIZE) {
    const batch = db.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(db.length / BATCH_SIZE);

    process.stdout.write('Batch ' + batchNum + '/' + totalBatches + ' (' + batch.length + ' kelime)... ');

    const results = await enrichBatch(batch);

    if (results && Array.isArray(results)) {
      for (const orig of batch) {
        const match = results.find(r => r.word && r.word.toLowerCase() === orig.word.toLowerCase());
        if (match) {
          enriched.push({
            ...orig,
            gameDefinition: match.gameDefinition || orig.definition,
            difficulty: match.difficulty || orig.difficulty || 'medium',
            flashHint: match.flashHint || ''
          });
          processed++;
        } else {
          enriched.push({ ...orig, gameDefinition: orig.definition, difficulty: orig.difficulty || 'medium', flashHint: '' });
          processed++;
        }
      }
      console.log('OK');
    } else {
      for (const orig of batch) {
        enriched.push({ ...orig, gameDefinition: orig.definition, difficulty: orig.difficulty || 'medium', flashHint: '' });
      }
      failed += batch.length;
      console.log('HATA - orijinal tanim kullanildi');
    }

    // Ara kayit (her 200 kelimede)
    if (enriched.length % 200 < BATCH_SIZE) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(enriched));
    }

    await delay(DELAY);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(enriched));

  const stats = { easy: 0, medium: 0, hard: 0 };
  enriched.forEach(q => stats[q.difficulty]++);

  console.log('\n=== SONUC ===');
  console.log('Islenen:', processed);
  console.log('Hatali:', failed);
  console.log('Zorluk:', stats);
  console.log('Dosya:', OUT_PATH);
}

main().catch(console.error);
