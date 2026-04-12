const fs = require('fs');
const path = require('path');
const API_KEY = fs.readFileSync('/root/.anthropic-key', 'utf8').trim();
const TDK_API = 'https://sozluk.gov.tr/gts?ara=';
const AUTO_PATH = path.join(__dirname, '../src/data/autocomplete.json');
const OUT_PATH = path.join(__dirname, '../src/data/questions-db.json');
const PER_LENGTH = 1000;
const TDK_DELAY = 500;
const CLAUDE_BATCH = 20;
const CLAUDE_DELAY = 2000;

var autocomplete = JSON.parse(fs.readFileSync(AUTO_PATH, 'utf8'));
var allWords = autocomplete.map(function(d) { return d.madde || d; }).filter(function(w) { return typeof w === 'string' && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w); });

function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function fetchTDK(word) {
  try {
    var res = await fetch(TDK_API + encodeURIComponent(word), { headers: { 'User-Agent': 'Dagarcik/1.0' } });
    var data = await res.json();
    if (data && data[0] && data[0].anlamlarListe) {
      var m = data[0].anlamlarListe[0];
      if (m.anlam && m.anlam.length >= 15 && m.anlam.indexOf('bakınız') === -1 && m.anlam.indexOf('►') === -1) {
        var def = m.anlam.replace(/^.*?:/g, '').trim();
        var regex = new RegExp(word, 'gi');
        def = def.replace(regex, '.......');
        def = def.charAt(0).toUpperCase() + def.slice(1);
        var origin = data[0].lisan || '';
        var om = origin.match(/^(Arapça|Farsça|Fransızca|İtalyanca|İngilizce|Almanca|Rumca|Yunanca)/i);
        origin = om ? om[1] : origin.split(' ')[0];
        var cat = (m.ozelliklerListe && m.ozelliklerListe[0] && m.ozelliklerListe[0].tam_adi) || '';
        return { word: word, length: word.length, definition: def, origin: origin, category: cat, example: '' };
      }
    }
  } catch(e) {}
  return null;
}

async function enrichBatch(batch) {
  var wordList = batch.map(function(q) { return q.word + ' | ' + q.definition + ' | ' + (q.origin || 'Turkce'); }).join('\n');
  var prompt = 'Sen bir Turkce kelime oyunu icin soru editorusun. Asagidaki kelimelerin her biri icin su 4 seyi uret:\n1. TANIM: Oyun icin kisa, anlasilir tanim. Kelimenin kendisini ASLA kullanma. 15-60 karakter.\n2. ZORLUK: easy/medium/hard\n3. HINT: O kelimeye ozel 2-6 kelimelik ipucu\n4. KATEGORI: Su kategorilerden biri sec: Gunluk Hayat, Yemek ve Mutfak, Doga ve Hayvanlar, Bilim ve Teknoloji, Sanat ve Kultur, Tarih ve Toplum, Spor ve Saglik, Meslekler, Genel\nEger hicbir kategoriye dogal olarak uymuyorsa Genel yaz.\n\nKelimeler:\n' + wordList + '\n\nYANITI SADECE JSON ARRAY olarak ver: [{"word":"x","gameDefinition":"x","difficulty":"x","flashHint":"x","themeCategory":"x"}]';
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }) });
    var data = await res.json();
    if (data.content && data.content[0]) {
      var text = data.content[0].text.trim();
      text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(text);
    }
  } catch(e) { console.error('Claude hata:', e.message); }
  return null;
}

async function main() {
  console.log('=== ADIM 1: TDK den kelime cekme ===');
  var rawDB = [];
  for (var len = 4; len <= 10; len++) {
    var candidates = allWords.filter(function(w) { return w.length === len; }).sort(function() { return Math.random() - 0.5; });
    var found = 0, tried = 0;
    console.log(len + 'h: hedef ' + PER_LENGTH);
    for (var ci = 0; ci < candidates.length; ci++) {
      if (found >= PER_LENGTH) break;
      tried++;
      var result = await fetchTDK(candidates[ci]);
      if (result) { rawDB.push(result); found++; if (found % 100 === 0) console.log('  ' + len + 'h: ' + found + '/' + PER_LENGTH); }
      await wait(TDK_DELAY);
    }
    console.log('  ' + len + 'h: TAMAM ' + found + ' kelime (' + tried + ' denendi)');
  }
  console.log('TDK toplam: ' + rawDB.length);
  fs.writeFileSync(OUT_PATH + '.raw', JSON.stringify(rawDB));

  console.log('\n=== ADIM 2: Claude ile zenginlestirme + kategorizasyon ===');
  var enriched = [];
  var totalBatches = Math.ceil(rawDB.length / CLAUDE_BATCH);
  for (var i = 0; i < rawDB.length; i += CLAUDE_BATCH) {
    var batch = rawDB.slice(i, i + CLAUDE_BATCH);
    var n = Math.floor(i / CLAUDE_BATCH) + 1;
    process.stdout.write('Claude ' + n + '/' + totalBatches + '... ');
    var results = await enrichBatch(batch);
    if (results && Array.isArray(results)) {
      for (var j = 0; j < batch.length; j++) {
        var m = results.find(function(r) { return r.word && r.word.toLowerCase() === batch[j].word.toLowerCase(); });
        enriched.push({ word: batch[j].word, length: batch[j].length, definition: batch[j].definition, origin: batch[j].origin, category: batch[j].category, example: '', gameDefinition: m ? m.gameDefinition : batch[j].definition, difficulty: m ? m.difficulty : 'medium', flashHint: m ? m.flashHint : '', themeCategory: m ? m.themeCategory : 'Genel' });
      }
      console.log('OK');
    } else {
      for (var j = 0; j < batch.length; j++) {
        enriched.push({ word: batch[j].word, length: batch[j].length, definition: batch[j].definition, origin: batch[j].origin, category: batch[j].category, example: '', gameDefinition: batch[j].definition, difficulty: 'medium', flashHint: '', themeCategory: 'Genel' });
      }
      console.log('HATA');
    }
    if (enriched.length % 200 < CLAUDE_BATCH) fs.writeFileSync(OUT_PATH, JSON.stringify(enriched));
    await wait(CLAUDE_DELAY);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(enriched));
  var stats = {};
  enriched.forEach(function(q) { stats[q.themeCategory] = (stats[q.themeCategory] || 0) + 1; });
  var diffs = { easy: 0, medium: 0, hard: 0 };
  enriched.forEach(function(q) { diffs[q.difficulty] = (diffs[q.difficulty] || 0) + 1; });
  console.log('\n=== SONUC ===');
  console.log('Toplam: ' + enriched.length);
  console.log('Kategoriler:', JSON.stringify(stats, null, 2));
  console.log('Zorluk:', JSON.stringify(diffs));
}
main();
