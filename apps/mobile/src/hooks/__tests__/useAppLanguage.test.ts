// The library registers its cleanup hooks lazily, i.e. inside a running test, which jest forbids
// (jest.setup.js turns the automatic ones off). Skip them and clean up explicitly.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useAppLanguage } from '../useAppLanguage';

const mockLoad = jest.fn((..._a: any[]) => Promise.resolve());
const mockRestart = jest.fn((..._a: any[]) => Promise.resolve(false));
const mockUpdateLang = jest.fn();
const mockUpdateStudy = jest.fn();
const mockUpdateUser = jest.fn();
let mockUser: any = { preferredLanguage: 'fr', studyLanguage: null };

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { language: 'fr', t: (k: string) => k },
  loadUserLanguage: (...a: any[]) => mockLoad(...a),
}));
jest.mock('../../i18n/rtl', () => ({ restartIfDirectionChanged: (...a: any[]) => mockRestart(...a) }));
jest.mock('../../services/api', () => ({
  api: {
    updateUserLanguage: (...a: any[]) => mockUpdateLang(...a),
    updateUserStudyLanguage: (...a: any[]) => mockUpdateStudy(...a),
  },
}));
jest.mock('../../store/authStore', () => {
  const useAuthStore: any = (sel: any) => sel({ user: mockUser });
  useAuthStore.getState = () => ({ updateUser: mockUpdateUser });
  return { useAuthStore };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  mockUser = { preferredLanguage: 'fr', studyLanguage: null };
});

describe('useAppLanguage', () => {
  test('reads the account languages', async () => {
    mockUser = { preferredLanguage: 'de', studyLanguage: 'es' };
    const { result } = await renderHook(() => useAppLanguage());
    expect(result.current.appLanguage).toBe('de');
    expect(result.current.studyLanguage).toBe('es');
  });

  test('switches the UI first, then saves, then stores what the server returned', async () => {
    mockUpdateLang.mockResolvedValue({ success: true, data: { user: { preferredLanguage: 'es' } } });
    const { result } = await renderHook(() => useAppLanguage());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setAppLanguage('es');
    });
    expect(ok).toBe(true);
    expect(mockLoad.mock.invocationCallOrder[0]).toBeLessThan(mockUpdateLang.mock.invocationCallOrder[0]);
    expect(mockUpdateUser).toHaveBeenCalledWith({ preferredLanguage: 'es' });
    expect(mockRestart).toHaveBeenCalledWith('es'); // only after the save
  });

  test('reverts the UI to the previous language when saving fails', async () => {
    mockUpdateLang.mockResolvedValue({ success: false, message: 'nope' });
    const { result } = await renderHook(() => useAppLanguage());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setAppLanguage('es');
    });
    expect(ok).toBe(false);
    expect(mockLoad).toHaveBeenNthCalledWith(1, 'es', { restart: false });
    expect(mockLoad).toHaveBeenNthCalledWith(2, 'fr', { restart: false });
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRestart).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'profile.languageUpdateFailed');
  });

  test('reverts when the request throws', async () => {
    mockUpdateLang.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useAppLanguage());
    await act(async () => {
      await result.current.setAppLanguage('es');
    });
    expect(mockLoad).toHaveBeenLastCalledWith('fr', { restart: false });
  });

  test('saves the study language, null meaning same as the app', async () => {
    mockUpdateStudy.mockResolvedValue({ success: true, data: { user: { studyLanguage: null } } });
    const { result } = await renderHook(() => useAppLanguage());
    await act(async () => {
      await result.current.setStudyLanguage(null);
    });
    expect(mockUpdateStudy).toHaveBeenCalledWith(null);
    expect(mockUpdateUser).toHaveBeenCalledWith({ studyLanguage: null });
    expect(mockLoad).not.toHaveBeenCalled(); // nothing on screen changes
  });

  test('a failed study language save changes nothing and says so', async () => {
    mockUpdateStudy.mockResolvedValue({ success: false });
    const { result } = await renderHook(() => useAppLanguage());
    await act(async () => {
      await result.current.setStudyLanguage('es');
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'profile.studyLanguageUpdateFailed');
  });
});
