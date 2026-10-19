// Whole-document mode is only for questions about the document as a whole. Anything more specific
// should still use similarity search, which is cheaper and more precise.
process.env.GOOGLE_PROJECT_ID = 'test-project';
jest.mock('google-auth-library', () => ({ GoogleAuth: jest.fn().mockImplementation(() => ({})) }));

import { WHOLE_DOCUMENT_INTENT } from '../chat.service';

describe('WHOLE_DOCUMENT_INTENT', () => {
  test.each([
    'Summarize this note for me',
    'summarise the document',
    'Give me a summary',
    'Can you give an overview of this lecture?',
    'What are the key points?',
    'List the main ideas',
    'TL;DR please',
    'recap this please',
    "What's this document about?",
    'what is the note about',
    'Explain this note',
    'explain the whole pdf',
  ])('uses the whole document for: %s', (question) => {
    expect(WHOLE_DOCUMENT_INTENT.test(question)).toBe(true);
  });

  test.each([
    'What is the mechanism of action of metformin?',
    'Which nerves arise from the upper trunk?',
    'What does the note say about Erb palsy?',
    'Explain how insulin works',
    'Define hypokalemia',
    'How many roots form the plexus?',
  ])('keeps similarity search for: %s', (question) => {
    expect(WHOLE_DOCUMENT_INTENT.test(question)).toBe(false);
  });
});
