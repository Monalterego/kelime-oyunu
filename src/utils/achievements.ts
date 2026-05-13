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
  { id: "first_game", title: "İlk Adım", description: "İlk oyununu tamamla", icon: "🏆" },
  { id: "sharp_10", title: "Keskin Nişancı", description: "Bir oyunda 10+ doğru cevap", icon: "🎯" },
  { id: "perfect", title: "Mükemmel", description: "Bir oyunda tüm soruları doğru bil", icon: "💯" },
  { id: "streak_3", title: "3 Günlük Seri", description: "3 gün üst üste oyna", icon: "🔥" },
  { id: "streak_7", title: "Haftalık Seri", description: "7 gün üst üste oyna", icon: "⚡" },
  { id: "total_100", title: "Hece Ustası", description: "Toplam 100 doğru cevap", icon: "📚" },
  { id: "total_500", title: "Kelime Gurusu", description: "Toplam 500 doğru cevap", icon: "🧠" },
  { id: "score_5000", title: "Puan Avcısı", description: "Tek oyunda 5000+ puan", icon: "🏅" },
  { id: "score_8000", title: "Efsane Skor", description: "Tek oyunda 8000+ puan", icon: "👑" },
  { id: "daily_first", title: "Günlük Rakip", description: "İlk günlük oyununu tamamla", icon: "📅" },
  { id: "no_skip", title: "Cesur Oyuncu", description: "Hiç pas geçmeden bir oyun bitir", icon: "💪" },
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
  streak: number;
  totalCorrect: number;
  totalGames: number;
}): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  const checks: [string, boolean][] = [
    ["first_game", gameData.totalGames >= 1],
    ["sharp_10", gameData.correct >= 10],
    ["perfect", gameData.correct === gameData.total],
    ["streak_3", gameData.streak >= 3],
    ["streak_7", gameData.streak >= 7],
    ["total_100", gameData.totalCorrect >= 100],
    ["total_500", gameData.totalCorrect >= 500],
    ["score_5000", gameData.score >= 5000],
    ["score_8000", gameData.score >= 8000],
    ["daily_first", gameData.mode === "daily"],
    ["no_skip", gameData.skipped === 0],
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
