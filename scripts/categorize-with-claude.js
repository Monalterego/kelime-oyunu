const fs = require('fs');
const path = require('path');
const API_KEY = fs.readFileSync('/root/.anthropic-key', 'utf8').trim();
const DB_PATH = path.join(__dirname, '../src/data/questions-db.json');
const BATCH_SIZE = 30;
const DELAY = 2000;
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function categorizeBatch(batch) {
  var wordList = batch.map(function(q) { return q.word + ' | ' + (q.gameDefinition || q.definition); }).join('\n');
  var prompt = 'Asagidaki kelimelerin her birini su kategorilerden SADECE BIRINE ata:\nGunluk Hayat, Yemek ve Mutfak, Doga ve Hayvanlar, Bilim ve Teknoloji, Sanat ve Kultur, Tarih ve Toplum, Spor ve Saglik, Meslekler\n\nKelimeler:\n' + wordList + '\n\nYANITI SADECE JSON ARRAY olarak ver. Her eleman: {"word":"kelime","themeCategory":"kategori"}\nBaska hicbir sey yazma.';
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }) });
    var data = await res.json();
    if (data.content && data.content[0]) { var text = data.content[0].text.trim(); text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, ''); return JSON.parse(text); }
  } catch(e) { console.error('Hata:', e.message); }
  return null;
}
async function main() {
  var db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  var ok = 0, fail = 0, total = Math.ceil(db.length / BATCH_SIZE);
  console.log('Toplam: ' + db.length + ' kelime, ' + total + ' batch');
  for (var i = 0; i < db.length; i += BATCH_SIZE) {
    var batch = db.slice(i, i + BATCH_SIZE);
    var n = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write('Batch ' + n + '/' + total + '... ');
    var results = await categorizeBatch(batch);
    if (results && Array.isArray(results)) {
      for (var j = 0; j < batch.length; j++) { var m = results.find(function(r) { return r.word && r.word.toLowerCase() === batch[j].word.toLowerCase(); }); batch[j].themeCategory = m ? m.themeCategory : 'Gunluk Hayat'; ok++; }
      console.log('OK');
    } else {
      for (var j = 0; j < batch.length; j++) { batch[j].themeCategory = 'Gunluk Hayat'; } fail += batch.length;
      console.log('HATA');
    }
    await wait(DELAY);
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db));
  var stats = {};
  db.forEach(function(q) { stats[q.themeCategory] = (stats[q.themeCategory] || 0) + 1; });
  console.log('\nSONUC: OK=' + ok + ' FAIL=' + fail);
  console.log(JSON.stringify(stats, null, 2));
}
main();
