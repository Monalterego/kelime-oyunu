var fs = require('fs');
var path = require('path');
var API_KEY = fs.readFileSync('/root/.anthropic-key', 'utf8').trim();
var DB_PATH = path.join(__dirname, '../src/data/questions-db.json');
var BATCH_SIZE = 20;
var DELAY = 2000;
function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
async function enrichBatch(batch) {
  var wordList = batch.map(function(q) { return q.word + ' | ' + q.definition + ' | ' + (q.origin || 'Turkce'); }).join('\n');
  var prompt = 'Sen bir Turkce kelime oyunu icin soru editorusun. Asagidaki kelimelerin her biri icin su 4 seyi uret:\n1. TANIM: Oyun icin kisa, anlasilir tanim. Kelimenin kendisini ASLA kullanma. 15-60 karakter.\n2. ZORLUK: easy/medium/hard\n3. HINT: O kelimeye ozel 2-6 kelimelik ipucu\n4. KATEGORI: Gunluk Hayat, Yemek ve Mutfak, Doga ve Hayvanlar, Bilim ve Teknoloji, Sanat ve Kultur, Tarih ve Toplum, Spor ve Saglik, Meslekler, Genel\nEger hicbir kategoriye dogal olarak uymuyorsa Genel yaz.\n\nKelimeler:\n' + wordList + '\n\nYANITI SADECE JSON ARRAY olarak ver: [{"word":"x","gameDefinition":"x","difficulty":"x","flashHint":"x","themeCategory":"x"}]';
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }) });
    var data = await res.json();
    if (data.content && data.content[0]) { var text = data.content[0].text.trim(); text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, ''); return JSON.parse(text); }
    if (data.error) console.error('API:', data.error.message);
  } catch(e) { console.error('Hata:', e.message); }
  return null;
}
async function main() {
  var db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  var todo = []; var idxs = [];
  for (var i = 0; i < db.length; i++) { if (db[i].themeCategory === 'Genel' && db[i].gameDefinition === db[i].definition) { todo.push(db[i]); idxs.push(i); } }
  console.log('Eksik: ' + todo.length);
  var ok = 0, fail = 0, total = Math.ceil(todo.length / BATCH_SIZE);
  for (var bi = 0; bi < todo.length; bi += BATCH_SIZE) {
    var batch = todo.slice(bi, bi + BATCH_SIZE);
    var bIdx = idxs.slice(bi, bi + BATCH_SIZE);
    var n = Math.floor(bi / BATCH_SIZE) + 1;
    process.stdout.write('Batch ' + n + '/' + total + '... ');
    var results = await enrichBatch(batch);
    if (results && Array.isArray(results)) {
      for (var j = 0; j < batch.length; j++) { var m = results.find(function(r) { return r.word && r.word.toLowerCase() === batch[j].word.toLowerCase(); }); if (m) { db[bIdx[j]].gameDefinition = m.gameDefinition || batch[j].definition; db[bIdx[j]].difficulty = m.difficulty || 'medium'; db[bIdx[j]].flashHint = m.flashHint || ''; db[bIdx[j]].themeCategory = m.themeCategory || 'Genel'; ok++; } else { fail++; } }
      console.log('OK');
    } else { fail += batch.length; console.log('HATA'); }
    if (ok % 200 < BATCH_SIZE) fs.writeFileSync(DB_PATH, JSON.stringify(db));
    await wait(DELAY);
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db));
  var cats = {}; db.forEach(function(q) { cats[q.themeCategory] = (cats[q.themeCategory] || 0) + 1; });
  console.log('\nSONUC: OK=' + ok + ' FAIL=' + fail);
  console.log(JSON.stringify(cats, null, 2));
}
main();
