/** ডেটাবেস ডাউন থাকলে দেখানোর জন্য লোকাল পোস্ট ক্যাশ (localStorage) */

const PREFIX = "gcb_cache_";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // ৭ দিন

type Entry<T> = { at: number; data: T };

export function saveCache<T>(key: string, data: T) {
  try {
    const entry: Entry<T> = { at: Date.now(), data };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function loadCache<T>(key: string): { data: T; at: Date } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (!entry || typeof entry.at !== "number") return null;
    if (Date.now() - entry.at > MAX_AGE_MS) return null;
    return { data: entry.data, at: new Date(entry.at) };
  } catch {
    return null;
  }
}

export function clearCache(key?: string) {
  try {
    if (key) {
      localStorage.removeItem(PREFIX + key);
      return;
    }
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
