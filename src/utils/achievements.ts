import AsyncStorage from "@react-native-async-storage/async-storage";

const ACH_KEY = "hece_achievements";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlocked" | "unlockedAt">[] = [
  // ── Tier 1: Başlangıç ────────────────────────────────
  { id: "first_game",      title: "İlk Adım",         description: "İlk oyununu tamamla",                   icon: "🎮" },
  { id: "daily_first",     title: "Günlük Rakip",      description: "İlk günlük oyununu tamamla",            icon: "📅" },
  { id: "category_first",  title: "Kaşif",             description: "İlk kategori oyununu oyna",             icon: "🗺️" },
  { id: "no_skip",         title: "Kararlı",           description: "Hiç pas geçmeden bir oyun bitir",       icon: "💪" },

  // ── Tier 2: Gelişen Oyuncu ───────────────────────────
  { id: "games_10",        title: "Gerçek Oyuncu",     description: "10 oyun tamamla",                       icon: "🎯" },
  { id: "games_25",        title: "Düzenli Oyuncu",    description: "25 oyun tamamla",                       icon: "🔑" },
  { id: "streak_3",        title: "Isınıyorum",        description: "3 gün üst üste oyna",                   icon: "🔥" },
  { id: "streak_7",        title: "Haftalık Seri",     description: "7 gün üst üste oyna",                   icon: "⚡" },
  { id: "total_100",       title: "Yüzlük Kulüp",      description: "Toplam 100 doğru cevap",                icon: "📚" },
  { id: "total_250",       title: "Kelime Avcısı",     description: "Toplam 250 doğru cevap",                icon: "🎓" },
  { id: "score_5000",      title: "Puan Avcısı",       description: "Tek oyunda 5000+ puan",                 icon: "🏅" },
  { id: "no_hint",         title: "Sezgici",           description: "Harf almadan bir oyun bitir",           icon: "🧩" },
  { id: "perfect",         title: "Mükemmel",          description: "Bir oyunda tüm soruları doğru bil",     icon: "💯" },

  // ── Tier 3: Usta ─────────────────────────────────────
  { id: "games_50",        title: "Elli Oyun",         description: "50 oyun tamamla",                       icon: "🏆" },
  { id: "games_100",       title: "Yüzüncü Oyun",      description: "100 oyun tamamla",                      icon: "👑" },
  { id: "streak_14",       title: "İki Haftalık Seri", description: "14 gün üst üste oyna",                  icon: "🌟" },
  { id: "streak_30",       title: "Aylık Seri",        description: "30 gün üst üste oyna",                  icon: "🌙" },
  { id: "total_500",       title: "Kelime Gurusu",     description: "Toplam 500 doğru cevap",                icon: "🧠" },
  { id: "total_1000",      title: "Dil Ustası",        description: "Toplam 1000 doğru cevap",               icon: "📖" },
  { id: "score_8000",      title: "Efsane Skor",       description: "Tek oyunda 8000+ puan",                 icon: "🔱" },
  { id: "score_10000",     title: "Söz Sultanı",       description: "Tek oyunda 10000+ puan",                icon: "💎" },
];

export async function getAchievements(): Promise<Achievement[]> {
  try {
    const data = await AsyncStorage.getItem(ACH_KEY);
    const unlocked: Record<string, string> = data ? JSON.parse(data) : {};
    return ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      unlocked: !!unlocked[def.id],
      unlockedAt: unlocked[def.id] || undefined,
    }));
  } catch {
    return ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: false }));
  }
}

async function unlockAchievement(id: string): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(ACH_KEY);
    const unlocked: Record<string, string> = data ? JSON.parse(data) : {};
    if (unlocked[id]) return false;
    unlocked[id] = new Date().toISOString();
    await AsyncStorage.setItem(ACH_KEY, JSON.stringify(unlocked));
    return true;
  } catch {
    return false;
  }
}

export async function checkAchievements(gameData: {
  mode: string;
  category?: string;
  score: number;
  correct: number;
  total: number;
  skipped: number;
  hintsUsed: number;
  streak: number;
  totalCorrect: number;
  totalGames: number;
}): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  const checks: [string, boolean][] = [
    // Tier 1
    ["first_game",     gameData.totalGames >= 1],
    ["daily_first",    gameData.mode === "daily"],
    ["category_first", gameData.mode === "category"],
    ["no_skip",        gameData.skipped === 0],
    // Tier 2
    ["games_10",       gameData.totalGames >= 10],
    ["games_25",       gameData.totalGames >= 25],
    ["streak_3",       gameData.streak >= 3],
    ["streak_7",       gameData.streak >= 7],
    ["total_100",      gameData.totalCorrect >= 100],
    ["total_250",      gameData.totalCorrect >= 250],
    ["score_5000",     gameData.score >= 5000],
    ["no_hint",        gameData.hintsUsed === 0],
    ["perfect",        gameData.correct === gameData.total && gameData.total > 0],
    // Tier 3
    ["games_50",       gameData.totalGames >= 50],
    ["games_100",      gameData.totalGames >= 100],
    ["streak_14",      gameData.streak >= 14],
    ["streak_30",      gameData.streak >= 30],
    ["total_500",      gameData.totalCorrect >= 500],
    ["total_1000",     gameData.totalCorrect >= 1000],
    ["score_8000",     gameData.score >= 8000],
    ["score_10000",    gameData.score >= 10000],
  ];
  for (const [id, condition] of checks) {
    if (condition) {
      const isNew = await unlockAchievement(id);
      if (isNew) {
        const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
        if (def) newlyUnlocked.push({ ...def, unlocked: true, unlockedAt: new Date().toISOString() });
      }
    }
  }
  return newlyUnlocked;
}
