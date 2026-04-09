const ORIGIN_HINTS: Record<string, string[]> = {
  "Arapca": ["Arapca kokenli bir kelime!", "Dogudan gelen bir soz..."],
  "Farsca": ["Farsca kokenli bir kelime!", "Iran kulturunden dilimize gecmis..."],
  "Fransizca": ["Bati kokenli bir kelime!", "Fransizcadan dilimize girmis..."],
  "Italyanca": ["Bati kokenli bir kelime!", "Akdeniz esintili bir soz..."],
  "Ingilizce": ["Bati kokenli bir kelime!", "Ingilizceden dilimize gecmis..."],
  "Rumca": ["Kadim bir kelime!", "Anadolu topraklarindan bir miras..."],
  "Yunanca": ["Kadim bir kelime!", "Antik dunyadan bir miras..."],
  "Almanca": ["Bati kokenli bir kelime!", "Almancadan dilimize gecmis..."],
};

const GENERIC_HINTS = [
  "Dikkat, zipir bir soru!",
  "Muzip bir soru geliyor...",
  "Kolay gorunup yaniltabilir!",
  "Herkesin bildigi ama kimsenin dusunemedigi...",
  "Ipucunu iyi dinle!",
  "Bu kelimeyi herkes bilir!",
  "Gunluk hayattan bir soz...",
  "Biraz dusun, bulacaksin!",
  "Hadi bakalim, bu kolay!",
  "Dikkatli ol, yakistirma yollu!",
  "Oz Turkce bir kelime!",
  "Dilimizin guzelligi...",
  "Klasik bir soru!",
  "Kelimelerin gucunu hisset!",
  "Bu sana tanidik gelecek...",
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
    hints.push("Oz Turkce bir kelime!", "Turkcemizin oz mali!");
  }

  if (wordLength >= 8) {
    hints.push("Uzun bir kelime, dikkat!", "Bu biraz uzun, hazir ol!");
  }

  hints.push(...GENERIC_HINTS);
  return hints[Math.floor(Math.random() * hints.length)];
}
