jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { stripCitationMarkers } from '../citationHelpers';

describe('stripCitationMarkers', () => {
  test.each([
    ['differ entirely [1]: loop vs thiazide', 'differ entirely: loop vs thiazide'],
    ['lumen-positive potential [2]. This disables', 'lumen-positive potential. This disables'],
    ['reabsorption occurs here [1][3] and there', 'reabsorption occurs here and there'],
    ['supported by trials [1, 3] in adults', 'supported by trials in adults'],
    ['a range of studies [2-4].', 'a range of studies.'],
    ['no markers here', 'no markers here'],
    ['a list [not a citation] stays', 'a list [not a citation] stays'],
  ])('%s', (input, expected) => {
    expect(stripCitationMarkers(input)).toBe(expected);
  });
});
