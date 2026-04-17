import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://ptpkaanbuykcsqnudvdh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cGthYW5idXlrY3NxbnVkdmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODE4MTAsImV4cCI6MjA5MTk1NzgxMH0.Vgli0dUFTbH8VTGZa3JGwRR67fWVWNBE7pGeD0JEne4";

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
    });
    if (error) { console.error("Skor kayit hatasi:", error); return false; }
    return true;
  } catch { return false; }
}

export async function getLeaderboard(period: "daily" | "weekly" | "monthly" | "alltime", mode?: string, dailyNumber?: number): Promise<any[]> {
  try {
    let query = supabase
      .from("scores")
      .select("score, correct, total, created_at, profiles(nickname)")
      .order("score", { ascending: false })
      .limit(50);

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
