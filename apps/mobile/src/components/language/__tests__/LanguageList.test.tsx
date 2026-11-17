// The library registers its cleanup hooks lazily, i.e. inside a running test, which jest forbids
// (jest.setup.js turns the automatic ones off). Skip them and clean up explicitly.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LanguageList } from '../LanguageList';
import { APP_LANGUAGES } from '../../../i18n/languages';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'languageList.searchPlaceholder': 'Search for a language',
        'languageList.noResults': 'No languages found',
        'languageList.defaultSameAsApp': 'Default (same as app)',
      })[key] ?? key,
  }),
}));
jest.mock('@clinicalfact/design-system', () => {
  const { Text } = require('react-native');
  const deep2: any = new Proxy({}, { get: () => '#000' });
  const theme = {
    colors: new Proxy({}, { get: () => deep2 }),
    spacing: new Proxy({}, { get: () => 8 }),
    borderRadius: new Proxy({}, { get: () => 8 }),
    typography: { textStyles: new Proxy({}, { get: () => ({}) }) },
  };
  return { theme, Icon: () => null, CheckIcon: () => <Text>✓</Text> };
});

describe('LanguageList', () => {
  test('lists the supported languages with a testID per code', async () => {
    await render(<LanguageList selected="en" onSelect={jest.fn()} />);
    expect(screen.getByTestId('language-en')).toBeTruthy();
    expect(screen.getByTestId('language-es')).toBeTruthy();
  });

  test('rows are radios and only the selected one is checked', async () => {
    await render(<LanguageList selected="es" onSelect={jest.fn()} />);
    expect(screen.getByTestId('language-es').props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId('language-es').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('language-fr').props.accessibilityState.checked).toBe(false);
  });

  test('tapping a row reports its code', async () => {
    const onSelect = jest.fn();
    await render(<LanguageList selected="en" onSelect={onSelect} />);
    await fireEvent.press(screen.getByTestId('language-fr'));
    expect(onSelect).toHaveBeenCalledWith('fr');
  });

  test('search ignores accents and matches native names', async () => {
    await render(<LanguageList selected="en" onSelect={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId('language-search'), 'espanol');
    expect(screen.getByTestId('language-es')).toBeTruthy();
    expect(screen.queryByTestId('language-fr')).toBeNull();
  });

  test('shows a message when nothing matches', async () => {
    await render(<LanguageList selected="en" onSelect={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId('language-search'), 'zzzzqq');
    expect(screen.getByText('No languages found')).toBeTruthy();
  });

  test('the native name is shown only when it adds information', async () => {
    await render(<LanguageList selected="en" onSelect={jest.fn()} />);
    expect(screen.getByText('Español')).toBeTruthy(); // under "Spanish"
    expect(screen.queryAllByText('English')).toHaveLength(0); // not under "English (US)"
  });

  test('the default row appears only when asked for, and reports null', async () => {
    const onSelect = jest.fn();
    const { rerender } = await render(<LanguageList selected={null} onSelect={onSelect} />);
    expect(screen.queryByText('Default (same as app)')).toBeNull();
    await rerender(<LanguageList selected={null} onSelect={onSelect} showDefaultOption />);
    await fireEvent.press(screen.getByText('Default (same as app)'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  test('starts with the first language of the shared list', async () => {
    await render(<LanguageList selected="en" onSelect={jest.fn()} />);
    expect(screen.getByTestId(`language-${APP_LANGUAGES[0].code}`)).toBeTruthy();
  });
});
