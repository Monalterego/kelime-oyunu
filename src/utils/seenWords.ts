import AsyncStorage from "@react-native-async-storage/async-storage";

const SEEN_KEY = "hece_seen_words_v1";

// Per-length pool sizes (matches questions-db active pool counts)
// When 80% of a length bucket is seen, that bucket resets
const RESET_THRESHOLD = 0.8;

export async function getSeenWords(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export async function markWordsSeen(words: string[], poolSizeByLength?: Record<number, number>): Promise<void> {
  try {
    const seen = await getSeenWords();
    words.forEach(w => seen.add(w));

    if (poolSizeByLength) {
      // Per-length reset: if 80% of a bucket is seen, remove that bucket from seen
      const seenByLength: Record<number, string[]> = {};
      for (const w of seen) {
        const len = w.length;
        if (!seenByLength[len]) seenByLength[len] = [];
        seenByLength[len].push(w);
      }
      for (const [lenStr, seenInBucket] of Object.entries(seenByLength)) {
        const len = Number(lenStr);
        const total = poolSizeByLength[len];
        if (total && seenInBucket.length >= total * RESET_THRESHOLD) {
          seenInBucket.forEach(w => seen.delete(w));
        }
      }
    }

    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {}
}

export async function clearSeenWords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_KEY);
  } catch {}
}
