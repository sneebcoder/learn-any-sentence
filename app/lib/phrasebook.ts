export type PhrasebookEntry = {
  english: string;
  hindi: string;
  romanization: string;
  emoji: string;
  learnedAt: string;
};

const KEY = "phrasebook";

export function savePhrase(entry: PhrasebookEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing: PhrasebookEntry[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Avoid duplicates by english text
    if (!existing.some((e) => e.english.toLowerCase() === entry.english.toLowerCase())) {
      existing.push(entry);
      localStorage.setItem(KEY, JSON.stringify(existing));
    }
  } catch {}
}

export function getPhrases(): PhrasebookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
