import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const PROFILE_KEY = "dagarcik_profile_id";
const NICKNAME_KEY = "dagarcik_nickname";

export async function getLocalProfile(): Promise<{ id: string; nickname: string } | null> {
  try {
    const id = await AsyncStorage.getItem(PROFILE_KEY);
    const nickname = await AsyncStorage.getItem(NICKNAME_KEY);
    if (id && nickname) return { id, nickname };
    return null;
  } catch {
    return null;
  }
}

export async function createProfile(nickname: string): Promise<{ id: string; nickname: string } | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ nickname })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return null;
      console.error("Profil olusturma hatasi:", error);
      return null;
    }
    await AsyncStorage.setItem(PROFILE_KEY, data.id);
    await AsyncStorage.setItem(NICKNAME_KEY, data.nickname);
    return { id: data.id, nickname: data.nickname };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function submitScore(record: {
  profileId: string;
  mode: string;
  category?: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  dailyNumber?: number;
  durationSeconds?: number;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("scores").insert({
      profile_id: record.profileId,
      mode: record.mode,
      category: record.category || null,
      score: record.score,
      correct: record.correct,
      wrong: record.wrong,
      skipped: record.skipped,
      total: record.total,
      daily_number: record.dailyNumber || null,
      duration_seconds: record.durationSeconds || null,
    });
    if (error) { console.error("Skor kayit hatasi:", error); return false; }
    return true;
  } catch { return false; }
}

// ── SORU GERİ BİLDİRİMİ (beta) ───────────────────────────────────────────
const FEEDBACK_KEY = "dagarcik_feedback_v2"; // verilen oyların local kaydı

export async function submitFeedback(word: string, vote: 1 | -1): Promise<boolean> {
  try {
    const { error } = await supabase.from("question_feedback").insert({ word, vote });
    if (error) { console.error("Feedback hatasi:", error); return false; }
    // Local'e kaydet — tekrar oy vermesin
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    const votes: Record<string, number> = raw ? JSON.parse(raw) : {};
    votes[word] = vote;
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(votes));
    return true;
  } catch { return false; }
}

export async function getLocalFeedbackVotes(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// Minimum oyun sayısı eşikleri — tek oyunla zirveye oturma önlemi
const MIN_GAMES: Record<string, number> = {
  weekly:  3,   // haftada en az 3 oyun
  monthly: 5,   // ayda en az 5 oyun
  alltime: 10,  // toplamda en az 10 oyun
};

export async function getLeaderboard(
  period: "daily" | "weekly" | "monthly" | "alltime",
  _mode?: string,
  dailyNumber?: number,
): Promise<any[]> {
  try {
    if (period === "daily" && dailyNumber) {
      const { data, error } = await supabase.rpc("get_leaderboard_daily", { daily_num: dailyNumber });
      if (error) { console.error("Leaderboard hatasi:", error); return []; }
      return (data || []).map((r: any) => ({
        score: r.score,
        correct: r.correct,
        total: r.total,
        duration_seconds: r.duration_secs,
        profiles: { nickname: r.nickname },
      }));
    }

    const startTs =
      period === "weekly"  ? (() => { const d = new Date(); d.setDate(d.getDate() - 7);  return d.toISOString(); })()
      : period === "monthly" ? (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString(); })()
      : null;

    const { data, error } = await supabase.rpc("get_leaderboard_period", {
      start_ts:  startTs,
      min_games: MIN_GAMES[period] ?? 1,
    });
    if (error) { console.error("Leaderboard hatasi:", error); return []; }
    return (data || []).map((r: any) => ({
      score: r.avg_score,
      correct: r.total_correct,
      total: r.total_total,
      profiles: { nickname: r.nickname },
      _games: r.games,
    }));
  } catch { return []; }
}
