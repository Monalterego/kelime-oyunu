const data = require('../src/data/questions-db-improved.json');

function norm(s) {
  return s.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
}

function tokenize(s) {
  return norm(s).split(/[\s,.()"'!?;:\-\/]+/).filter(t => t.length > 0);
}

const exact = [];    // Tam eşleşme (kesinlikle spoiler)
const stem  = [];    // Kök eşleşme (muhtemelen spoiler)

for (const item of data) {
  const rawWord = item.displayWord || item.word || '';
  const def = item.gameDefinition || item.definition || '';
  if (!rawWord || !def) continue;

  const defTokens = tokenize(def);
  const wordParts = rawWord.split(' ').filter(p => p.length >= 3);

  for (const part of wordParts) {
    const normPart = norm(part);
    if (normPart.length < 3) continue;

    // 1) Tam eşleşme: token === normPart
    if (defTokens.some(t => t === normPart)) {
      exact.push({ word: rawWord, match: part, definition: def });
      break;
    }
    // 2) Kök eşleşme: tanımdaki token normPart ile başlıyor (min 4 harf)
    if (normPart.length >= 4 && defTokens.some(t => t.startsWith(normPart) && t !== normPart)) {
      stem.push({ word: rawWord, match: part, definition: def });
      break;
    }
  }
}

console.log('=== TAM ESLESME (kesin spoiler): ' + exact.length + ' ===');
exact.forEach((p, i) => {
  console.log((i+1) + '. [' + p.word + '] -> "' + p.match + '"');
  console.log('   ' + p.definition);
});

console.log('');
console.log('=== KOK ESLESME (muhtemel spoiler): ' + stem.length + ' ===');
stem.forEach((p, i) => {
  console.log((i+1) + '. [' + p.word + '] -> "' + p.match + '"');
  console.log('   ' + p.definition);
});
