const ORIGIN_HINTS: Record<string, string[]> = {
  "Arapça": ["Arapça kökenli bir kelime!", "Doğudan gelen bir söz..."],
  "Farsça": ["Farsça kökenli bir kelime!", "İran kültüründen dilimize geçmiş..."],
  "Fransızca": ["Batı kökenli bir kelime!", "Fransızcadan dilimize girmiş..."],
  "İtalyanca": ["Batı kökenli bir kelime!", "Akdeniz esintili bir söz..."],
  "İngilizce": ["Batı kökenli bir kelime!", "İngilizceden dilimize geçmiş..."],
  "Rumca": ["Kadim bir kelime!", "Anadolu topraklarından bir miras..."],
  "Yunanca": ["Kadim bir kelime!", "Antik dünyadan bir miras..."],
  "Almanca": ["Batı kökenli bir kelime!", "Almancadan dilimize geçmiş..."],
};

const GENERIC_HINTS = [
  "Dikkat, zıpır bir soru!",
  "Muzip bir soru geliyor...",
  "Kolay görünüp yanıltabilir!",
  "Herkesin bildiği ama kimsenin düşünemediği...",
  "İpucunu iyi dinle!",
  "Bu kelimeyi herkes bilir!",
  "Günlük hayattan bir söz...",
  "Biraz düşün, bulacaksın!",
  "Hadi bakalım, bu kolay!",
  "Dikkatli ol, yakıştırma yollu!",
  "Öz Türkçe bir kelime!",
  "Dilimizin güzelliği...",
  "Klasik bir soru!",
  "Kelimelerin gücünü hisset!",
  "Bu sana tanıdık gelecek...",
];

export function generateFlashHint(origin: string, category: string, wordLength: number): string {
  const hints: string[] = [];

  for (const [key, values] of Object.entries(ORIGIN_HINTS)) {
    if (origin.toLowerCase().includes(key.toLowerCase())) {
      hints.push(...values);
      break;
    }
  }

  if (hints.length === 0 && (!origin || origin === "")) {
    hints.push("Öz Türkçe bir kelime!", "Türkçemizin öz malı!");
  }

  if (wordLength >= 8) {
    hints.push("Uzun bir kelime, dikkat!", "Bu biraz uzun, hazır ol!");
  }

  hints.push(...GENERIC_HINTS);
  return hints[Math.floor(Math.random() * hints.length)];
}