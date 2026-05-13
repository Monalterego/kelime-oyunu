import { readFileSync, writeFileSync } from "fs";

const db = JSON.parse(readFileSync("src/data/questions-db.json", "utf8"));

const STOP_WORDS = new Set([
  "ve","veya","ile","bir","bu","şu","o","da","de","ki","için","gibi","kadar",
  "daha","çok","en","her","hiç","olan","olarak","ait","göre","karşı","sonra",
  "önce","üzere","beri","itibaren","arasında","içinde","üzerinde","altında",
  "yanında","etmek","olmak","yapmak","eden","edilen","yapılan","ilgili","sahip",
]);

function tokenize(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğışöüâîû\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function esc(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const issues = [];

for (const entry of db) {
  if (entry.skip) continue;
  if (!entry.flashHint) continue;

  const word = entry.word.toLocaleLowerCase("tr-TR");
  const hint = entry.flashHint.toLocaleLowerCase("tr-TR");
  const def = (entry.gameDefinition || entry.definition || "").toLocaleLowerCase("tr-TR");
  const hintTokens = new Set(tokenize(hint));
  const defTokens = tokenize(def);
  const flags = [];

  if (hint.includes(word)) flags.push("CEVABI_ICERIYOR");
  if (word.length >= 5 && hint.includes(word.slice(0, 4)) && !hint.includes(word)) flags.push("KOK_AFISE");
  const overlap = defTokens.filter(t => t.length > 3 && hintTokens.has(t));
  if (overlap.length >= 2) flags.push("TANIM_TEKRARI(" + overlap.join(",") + ")");
  if (hintTokens.size <= 1) flags.push("COK_KISA");

  if (flags.length > 0) {
    issues.push({
      word: entry.word,
      length: entry.length,
      hint: entry.flashHint,
      definition: entry.gameDefinition || entry.definition || "",
      flags: flags.join(" | "),
    });
  }
}

function cell(val, type = "String") {
  return `<Cell><Data ss:Type="${type}">${esc(String(val))}</Data></Cell>`;
}

const headerRow = `<Row>${cell("Kelime")}${cell("Uzunluk")}${cell("Hint")}${cell("Tanim")}${cell("Sorunlar")}</Row>`;
const dataRows = issues.map(i =>
  `<Row>${cell(i.word)}${cell(i.length, "Number")}${cell(i.hint)}${cell(i.definition)}${cell(i.flags)}</Row>`
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Hint Audit">
<Table>
${headerRow}
${dataRows}
</Table>
</Worksheet>
</Workbook>`;

writeFileSync("C:/Users/hasan/Downloads/hint-audit.xls", xml, "utf8");
console.log("Tamamlandı:", issues.length, "satır → hint-audit.xls");
