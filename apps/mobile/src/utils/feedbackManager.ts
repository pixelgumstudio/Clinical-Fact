import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SHOWN_KEY = '@last_feedback_shown_time';
const NOTE_COUNT_KEY = '@feedback_note_count';

const COOLDOWN_MS = 120 * 60 * 60 * 1000; // 120 hours
const MILESTONE_COUNT = 5;

export async function shouldShowFeedback(): Promise<boolean> {
  const [lastShownRaw, countRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_SHOWN_KEY),
    AsyncStorage.getItem(NOTE_COUNT_KEY),
  ]);

  const count = countRaw ? parseInt(countRaw, 10) : 0;
  const isMilestone = count > 0 && count % MILESTONE_COUNT === 0;
  if (isMilestone) return true;

  if (!lastShownRaw) return true;
  return Date.now() - parseInt(lastShownRaw, 10) >= COOLDOWN_MS;
}

export async function recordFeedbackShown(): Promise<void> {
  await AsyncStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
}

export async function resetFeedbackCooldown(): Promise<void> {
  await AsyncStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
}

export async function incrementNoteCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(NOTE_COUNT_KEY);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await AsyncStorage.setItem(NOTE_COUNT_KEY, next.toString());
  return next;
}
