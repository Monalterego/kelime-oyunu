import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "dagarcik_game_history";
const MAX_HISTORY = 50;

export interface GameRecord {
  id: string;
  date: string;
  mode: "classic" | "category" | "daily";
  category?: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
}

export async function saveGameRecord(record: Omit<GameRecord, "id" | "date">): Promise<void> {
  try {
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
  const history = await getGameHistory();
  if (history.length === 0) {
    return { totalGames: 0, bestScore: 0, avgScore: 0, totalCorrect: 0, streak: 0 };
  }

  const totalGames = history.length;
  const bestScore = Math.max(...history.map(h => h.score));
  const avgScore = Math.round(history.reduce((sum, h) => sum + h.score, 0) / totalGames);
  const totalCorrect = history.reduce((sum, h) => sum + h.correct, 0);

  // Streak: kaç gün ard arda oynandı.
  // Bugün oynanmadıysa dünden başla (streak'i kırmaz), oynanmışsa bugün de sayılır.
  const playedDays = new Set(history.map(h => h.date.slice(0, 10)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const startOffset = playedDays.has(todayStr) ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i < MAX_HISTORY; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (playedDays.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }

  return { totalGames, bestScore, avgScore, totalCorrect, streak };
}


const DAILY_KEY = "dagarcik_daily_played";

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
