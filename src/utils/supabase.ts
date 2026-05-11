import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const PROFILE_KEY = "hece_profile_id";
const NICKNAME_KEY = "hece_nickname";

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

export async function getLeaderboard(period: "daily" | "weekly" | "monthly" | "alltime", mode?: string, dailyNumber?: number): Promise<any[]> {
  try {
    let query = supabase
      .from("scores")
      .select("score, correct, total, created_at, profile_id, duration_seconds, profiles(nickname)")
      .not("profile_id", "is", "null")
      .order("score", { ascending: false })
      .limit(500);

    if (mode) query = query.eq("mode", mode);

    if (period === "daily" && dailyNumber) {
      query = query.eq("daily_number", dailyNumber);
    } else if (period === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
    } else if (period === "monthly") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte("created_at", monthAgo.toISOString());
    }

    const { data, error } = await query;
    if (error) { console.error("Leaderboard hatasi:", error); return []; }
    return data || [];
  } catch { return []; }
}
