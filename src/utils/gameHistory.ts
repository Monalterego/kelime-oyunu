import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "hece_game_history";
const STATS_KEY = "hece_game_stats";
const MAX_HISTORY = 20; // Son 20 oyun gösterim için tutulur, istatistikler ayrı sayaçta

export interface GameRecord {
  id: string;
  date: string;
  mode: "classic" | "category";
  category?: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
}

interface StatsCounter {
  totalGames: number;
  bestScore: number;
  totalCorrect: number;
  totalScore: number; // avgScore hesabı için
}

async function getStatsCounter(): Promise<StatsCounter> {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : { totalGames: 0, bestScore: 0, totalCorrect: 0, totalScore: 0 };
  } catch {
    return { totalGames: 0, bestScore: 0, totalCorrect: 0, totalScore: 0 };
  }
}

async function updateStatsCounter(record: Omit<GameRecord, "id" | "date">): Promise<void> {
  try {
    const counter = await getStatsCounter();
    counter.totalGames += 1;
    counter.bestScore = Math.max(counter.bestScore, record.score);
    counter.totalCorrect += record.correct;
    counter.totalScore += record.score;
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(counter));
  } catch (e) {
    console.error("Stats sayaci guncellenemedi:", e);
  }
}

export async function saveGameRecord(record: Omit<GameRecord, "id" | "date">): Promise<void> {
  try {
    // Sayaçları güncelle (limit yok)
    await updateStatsCounter(record);

    // Son 20 oyun geçmişini güncelle (gösterim için)
    const history = await getGameHistory();
    const newRecord: GameRecord = {
      ...record,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    history.unshift(newRecord);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Oyun kaydedilemedi:", e);
  }
}

export async function getGameHistory(): Promise<GameRecord[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Gecmis okunamadi:", e);
    return [];
  }
}

export async function getStats(): Promise<{
  totalGames: number;
  bestScore: number;
  avgScore: number;
  totalCorrect: number;
  streak: number;
}> {
  const [counter, history] = await Promise.all([getStatsCounter(), getGameHistory()]);

  const totalGames = counter.totalGames;
  const bestScore = counter.bestScore;
  const totalCorrect = counter.totalCorrect;
  const avgScore = totalGames > 0 ? Math.round(counter.totalScore / totalGames) : 0;

  // Streak: history'den hesaplanır (son 20 oyun yeterli — günlük kontrol)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().slice(0, 10);
    const played = history.some(h => h.date.slice(0, 10) === dateStr);
    if (played) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return { totalGames, bestScore, avgScore, totalCorrect, streak };
}


const DAILY_KEY = "hece_daily_played";

export async function markDailyPlayed(dailyNumber: number, score: number, correct: number, total: number): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_KEY, JSON.stringify({ dailyNumber, score, correct, total }));
  } catch (e) {
    console.error("Daily kayit hatasi:", e);
  }
}

export async function getDailyStatus(): Promise<{ played: boolean; dailyNumber: number; score: number; correct: number; total: number } | null> {
  try {
    const data = await AsyncStorage.getItem(DAILY_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}
