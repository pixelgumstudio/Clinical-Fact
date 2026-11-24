// The library registers its cleanup hooks lazily, i.e. inside a running test, which jest forbids
// (jest.setup.js turns the automatic ones off). Skip them and clean up explicitly.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LanguageSelectScreen } from '../LanguageSelectScreen';

const mockReplace = jest.fn();
const mockRemember = jest.fn((_code: string) => Promise.resolve());
const mockLoad = jest.fn((_code: string) => Promise.resolve());
const mockRestart = jest.fn((_code: string) => Promise.resolve(false));
let mockLang = 'en';
const mockListeners = new Set<() => void>();

const STRINGS: Record<string, Record<string, string>> = {
  en: { 'auth.languageSelect.title': 'Select your language', 'auth.buttons.continue': 'Continue' },
  es: { 'auth.languageSelect.title': 'Selecciona tu idioma', 'auth.buttons.continue': 'Continuar' },
};

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ replace: mockReplace }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('react-i18next', () => {
  const React = require('react');
  return {
    useTranslation: () => {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const l = () => force((n: number) => n + 1);
        mockListeners.add(l);
        return () => void mockListeners.delete(l);
      }, []);
      return { t: (k: string) => STRINGS[mockLang]?.[k] ?? k };
    },
  };
});
jest.mock('../../../i18n', () => ({
  __esModule: true,
  default: {
    get language() {
      return mockLang;
    },
  },
  loadUserLanguage: (code: string) => {
    mockLang = code;
    mockListeners.forEach((l) => l());
    return mockLoad(code);
  },
}));
jest.mock('../../../i18n/rtl', () => ({ restartIfDirectionChanged: (c: string) => mockRestart(c) }));
jest.mock('../../../services/languagePreference', () => ({ rememberOnboardingLanguage: (c: string) => mockRemember(c) }));
jest.mock('../../../components/language/LanguageList', () => {
  const { Pressable, Text } = require('react-native');
  return {
    LanguageList: ({ selected, onSelect }: any) => (
      <>
        {['en', 'es'].map((c) => (
          <Pressable key={c} testID={`language-${c}`} onPress={() => onSelect(c)} accessibilityState={{ checked: selected === c }}>
            <Text>{c}</Text>
          </Pressable>
        ))}
      </>
    ),
  };
});
jest.mock('@clinicalfact/design-system', () => {
  const { Pressable, Text } = require('react-native');
  const leaf: any = new Proxy({}, { get: () => '#000' });
  return {
    theme: {
      colors: new Proxy({}, { get: () => leaf }),
      spacing: new Proxy({}, { get: () => 8 }),
      borderRadius: new Proxy({}, { get: () => 8 }),
      typography: { textStyles: new Proxy({}, { get: () => ({}) }) },
    },
    Button: ({ children, onPress, disabled }: any) => (
      <Pressable testID="continue" onPress={onPress} disabled={disabled}>
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});

beforeEach(() => {
  mockLang = 'en';
  jest.clearAllMocks();
});

describe('LanguageSelectScreen', () => {
  test('starts on the language the app is in', async () => {
    await render(<LanguageSelectScreen />);
    expect(screen.getByTestId('language-en').props.accessibilityState.checked).toBe(true);
  });

  test('picking a language re-translates the title and the button at once', async () => {
    await render(<LanguageSelectScreen />);
    expect(screen.getByText('Select your language')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('language-es'));
    expect(await screen.findByText('Selecciona tu idioma')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expect(mockLoad).toHaveBeenCalledWith('es');
    expect(mockRestart).not.toHaveBeenCalled(); // a preview never restarts
  });

  test('Continue saves the pick once, even when tapped twice quickly', async () => {
    await render(<LanguageSelectScreen />);
    await fireEvent.press(screen.getByTestId('language-es'));
    const button = screen.getByTestId('continue');
    await fireEvent.press(button);
    await fireEvent.press(button);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('Intro'));
    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith('es');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  test('when the direction changes the app restarts instead of navigating', async () => {
    mockRestart.mockResolvedValueOnce(true);
    await render(<LanguageSelectScreen />);
    await fireEvent.press(screen.getByTestId('continue'));
    await waitFor(() => expect(mockRestart).toHaveBeenCalledWith('en'));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
