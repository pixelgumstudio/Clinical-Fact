jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import i18n, { loadUserLanguage } from '../../i18n';
import { localizeServerMessage } from '../serverMessages';

describe('localizeServerMessage', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  test('known messages are shown in the active language', async () => {
    await loadUserLanguage('es');
    const out = localizeServerMessage('Quiz not found');
    expect(out).not.toBe('Quiz not found');
    expect(out.length).toBeGreaterThan(0);
  });

  test('English stays English', () => {
    expect(localizeServerMessage('Quiz not found')).toBe('Quiz not found');
  });

  test('unknown or empty messages pass through unchanged', async () => {
    await loadUserLanguage('es');
    expect(localizeServerMessage('Something brand new')).toBe('Something brand new');
    expect(localizeServerMessage(undefined)).toBeUndefined();
    expect(localizeServerMessage('')).toBe('');
  });
});
