import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRtlLanguage, syncLayoutDirection } from '../rtl';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-updates', () => ({ reloadAsync: jest.fn(() => Promise.resolve()) }));

const setRtl = (value: boolean) => {
  (I18nManager as any).isRTL = value;
};

describe('isRtlLanguage', () => {
  test.each(['ar', 'ar-AE', 'ar-EG', 'he', 'ur'])('%s is right to left', (code) => {
    expect(isRtlLanguage(code)).toBe(true);
  });

  test.each(['en', 'es', 'fr-CA', 'zh-CN', 'hi', 'tr'])('%s is left to right', (code) => {
    expect(isRtlLanguage(code)).toBe(false);
  });

  test('missing language is left to right', () => {
    expect(isRtlLanguage(undefined)).toBe(false);
    expect(isRtlLanguage('')).toBe(false);
  });
});

describe('syncLayoutDirection', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (Updates.reloadAsync as jest.Mock).mockClear();
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
    setRtl(false);
  });

  test('no restart when the direction already matches', async () => {
    expect(await syncLayoutDirection('en')).toBe(false);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  test('switching to Arabic forces RTL and restarts once', async () => {
    expect(await syncLayoutDirection('ar')).toBe(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });

  test('does not restart in a loop if the runtime ignores forceRTL', async () => {
    await syncLayoutDirection('ar');
    expect(await syncLayoutDirection('ar')).toBe(false);
    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });

  test('switching back to a left-to-right language restarts again', async () => {
    setRtl(true);
    expect(await syncLayoutDirection('en')).toBe(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(false);
  });
});
