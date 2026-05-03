import AsyncStorage from "@react-native-async-storage/async-storage";

const SEEN_KEY = "dagarcik_seen_words_v1";

export async function getSeenWords(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export async function markWordsSeen(words: string[]): Promise<void> {
  try {
    const seen = await getSeenWords();
    words.forEach(w => seen.add(w));
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {}
}

export async function clearSeenWords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_KEY);
  } catch {}
}
