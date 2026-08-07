import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CONSENT_KEY = 'ai_data_consent_given';

export async function checkAIConsent(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(AI_CONSENT_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function saveAIConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
  } catch {}
}
