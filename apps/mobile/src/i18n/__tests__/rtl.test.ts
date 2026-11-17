import { DevSettings, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyDirection, isRtlLanguage, restartIfDirectionChanged } from '../rtl';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-updates', () => ({ reloadAsync: jest.fn(() => Promise.resolve()) }));

const setRtl = (value: boolean) => {
  (I18nManager as any).isRTL = value;
};

describe('isRtlLanguage', () => {
  test.each(['ar', 'ar-AE', 'ar-EG', 'he', 'ur', 'fa'])('%s is right to left', (code) => {
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

describe('applyDirection', () => {
  beforeEach(() => {
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
  });

  test.each(['ar', 'he', 'ur'])('%s allows and forces right to left', (code) => {
    applyDirection(code);
    expect(I18nManager.allowRTL).toHaveBeenCalledWith(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
  });

  test.each(['en', 'es', 'zh-CN', 'hi'])('%s forces right to left OFF, so an Arabic phone does not flip it', (code) => {
    applyDirection(code);
    expect(I18nManager.allowRTL).toHaveBeenCalledWith(false);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(false);
  });

  test('never restarts by itself', () => {
    applyDirection('ar');
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });
});

describe('restartIfDirectionChanged', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (Updates.reloadAsync as jest.Mock).mockClear();
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
    setRtl(false);
  });

  test('no restart when the direction already matches', async () => {
    expect(await restartIfDirectionChanged('en')).toBe(false);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  test('switching to Arabic forces RTL and restarts once', async () => {
    expect(await restartIfDirectionChanged('ar')).toBe(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });

  test('the restart marker stops a loop if the runtime ignores forceRTL', async () => {
    await restartIfDirectionChanged('ar');
    expect(await restartIfDirectionChanged('ar')).toBe(false);
    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
  });

  test('switching back to a left-to-right language restarts again', async () => {
    setRtl(true);
    expect(await restartIfDirectionChanged('en')).toBe(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(false);
  });

  test('the marker is cleared once the direction matches, so a later change can restart', async () => {
    await restartIfDirectionChanged('ar'); // marker set for rtl
    setRtl(true); // the restart worked
    expect(await restartIfDirectionChanged('ar')).toBe(false); // matches, marker cleared
    setRtl(false);
    expect(await restartIfDirectionChanged('ar')).toBe(true); // can restart again
  });

  test('falls back to the dev reload when expo-updates cannot reload', async () => {
    (Updates.reloadAsync as jest.Mock).mockRejectedValueOnce(new Error('no updates runtime'));
    const reload = jest.spyOn(DevSettings, 'reload').mockImplementation(() => undefined);
    expect(await restartIfDirectionChanged('ar')).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
