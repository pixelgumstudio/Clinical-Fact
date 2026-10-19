jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import i18n, { loadUserLanguage } from '../../i18n';
import { formatDateShort, formatDayAndTime } from '../formatDate';

describe('localized dates', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  test('a past date is formatted in the active language', async () => {
    const date = new Date(2026, 0, 5, 15, 45);
    const english = formatDateShort(date);
    await loadUserLanguage('es');
    const spanish = formatDateShort(date);
    expect(english).toMatch(/Jan/);
    expect(spanish).not.toBe(english);
  });

  test('today is labelled in the active language, not hard-coded', async () => {
    await loadUserLanguage('es');
    const { day } = formatDayAndTime(new Date());
    expect(day).toBe(i18n.t('utils.formatDate.today'));
    expect(day).not.toBe('Today');
  });
});
