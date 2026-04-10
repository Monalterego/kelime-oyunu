const fs = require('fs');
const path = require('path');
const TDK_API = 'https://sozluk.gov.tr/gts?ara=';
const DELAY = 500;
const PER_LENGTH = 500;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/autocomplete.json'), 'utf8'));
const allWords = data.map(d => d.madde || d).filter(w => typeof w === 'string' && /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/.test(w));
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitize(def, word) {
  const regex = new RegExp(word, 'gi');
  let cleaned = def.replace(/^.*?:/g, '').trim();
  cleaned = cleaned.replace(regex, '.......');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
async function fetchWord(word) {
  try {
    const res = await fetch(TDK_API + encodeURIComponent(word), { headers: { 'User-Agent': 'Dagarcik/1.0' } });
    const d = await res.json();
    const entry = d[0];
    const m = entry.anlamlarListe[0];
    return { word, length: word.length, definition: sanitize(m.anlam, word), origin: entry.lisan || '', category: (m.ozelliklerListe && m.ozelliklerListe[0] && m.ozelliklerListe[0].tam_adi) || '', example: (m.orneklerListe && m.orneklerListe[0] && m.orneklerListe[0].ornek) || '' };
  } catch { return null; }
}
async function main() {
  const questions = [];
  for (let len = 4; len <= 10; len++) {
    const candidates = allWords.filter(w => w.length === len).sort(() => Math.random() - 0.5);
    let found = 0, tried = 0;
    console.log(len + ' harfli basliyor (hedef: ' + PER_LENGTH + ')');
    for (const word of candidates) {
      if (found >= PER_LENGTH) break;
      tried++;
      const result = await fetchWord(word);
      if (result) { questions.push(result); found++; if (found % 100 === 0) console.log('  ' + len + 'h: ' + found + '/' + PER_LENGTH); }
      await delay(DELAY);
    }
    console.log('  ' + len + 'h: TAMAM - ' + found + ' kelime (' + tried + ' denendi)');
  }
  const outPath = path.join(__dirname, '../src/data/questions-db.json');
  fs.writeFileSync(outPath, JSON.stringify(questions));
  console.log('BITTI! Toplam: ' + questions.length + ' kelime');
  console.log('Dosya: ' + outPath);
}
main().catch(console.error);