import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "dagarcik_game_history";
const MAX_HISTORY = 20;

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

  // Streak: ardisik gun sayisi
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
