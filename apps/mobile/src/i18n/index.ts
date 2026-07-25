/**
 * i18n Configuration
 *
 * This file configures i18next for internationalization.
 * It loads translation files and syncs with user's language preference.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';

const LANGUAGE_STORAGE_KEY = '@clinicfact:language';

// Language resources (start with English only, load others on-demand)
const resources = {
  en: { translation: en },
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback to English if translation missing
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

/**
 * Load and set user's preferred language
 */
export const loadUserLanguage = async (preferredLanguage?: string) => {
  try {
    let language = preferredLanguage;

    // If no language provided, check AsyncStorage
    if (!language) {
      language = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) ?? undefined;
    }

    // If still no language, use default
    if (!language) {
      language = 'en';
    }

    // Load language file if not already loaded
    if (!resources[language as keyof typeof resources]) {
      await loadLanguageFile(language);
    }

    // Change language
    await i18n.changeLanguage(language);

    // Save to storage
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);

    console.log('✅ Language loaded:', language);
  } catch (error) {
    console.error('❌ Error loading language:', error);
    await i18n.changeLanguage('en'); // Fallback to English
  }
};

/**
 * Dynamically load a language file
 */
const loadLanguageFile = async (languageCode: string) => {
  try {
    console.log(`📥 Loading language file: ${languageCode}`);

    let translations;

    // Dynamically import language file
    try {
      switch (languageCode) {
        case 'es':
          translations = require('./locales/es.json');
          break;
        case 'fr':
          translations = require('./locales/fr.json');
          break;
        case 'de':
          translations = require('./locales/de.json');
          break;
        case 'pt':
          translations = require('./locales/pt.json');
          break;
        case 'zh-CN':
          translations = require('./locales/zh-CN.json');
          break;
        case 'zh-TW':
          translations = require('./locales/zh-TW.json');
          break;
        case 'ja':
          translations = require('./locales/ja.json');
          break;
        case 'ko':
          translations = require('./locales/ko.json');
          break;
        case 'ar':
          translations = require('./locales/ar.json');
          break;
        case 'hi':
          translations = require('./locales/hi.json');
          break;
        case 'ru':
          translations = require('./locales/ru.json');
          break;
        case 'it':
          translations = require('./locales/it.json');
          break;
        case 'pl':
          translations = require('./locales/pl.json');
          break;
        case 'nl':
          translations = require('./locales/nl.json');
          break;
        case 'sv':
          translations = require('./locales/sv.json');
          break;
        case 'tr':
          translations = require('./locales/tr.json');
          break;
        case 'vi':
          translations = require('./locales/vi.json');
          break;
        case 'th':
          translations = require('./locales/th.json');
          break;
        case 'id':
          translations = require('./locales/id.json');
          break;
        case 'no':
          translations = require('./locales/no.json');
          break;
        case 'da':
          translations = require('./locales/da.json');
          break;
        case 'fi':
          translations = require('./locales/fi.json');
          break;
        case 'el':
          translations = require('./locales/el.json');
          break;
        case 'ca':
          translations = require('./locales/ca.json');
          break;
        case 'uk':
          translations = require('./locales/uk.json');
          break;
        case 'cs':
          translations = require('./locales/cs.json');
          break;
        case 'sk':
          translations = require('./locales/sk.json');
          break;
        case 'sl':
          translations = require('./locales/sl.json');
          break;
        case 'ro':
          translations = require('./locales/ro.json');
          break;
        case 'hu':
          translations = require('./locales/hu.json');
          break;
        case 'hr':
          translations = require('./locales/hr.json');
          break;
        case 'he':
          translations = require('./locales/he.json');
          break;
        case 'ms':
          translations = require('./locales/ms.json');
          break;
        case 'bn':
          translations = require('./locales/bn.json');
          break;
        case 'ta':
          translations = require('./locales/ta.json');
          break;
        case 'te':
          translations = require('./locales/te.json');
          break;
        case 'kn':
          translations = require('./locales/kn.json');
          break;
        case 'ml':
          translations = require('./locales/ml.json');
          break;
        case 'mr':
          translations = require('./locales/mr.json');
          break;
        case 'gu':
          translations = require('./locales/gu.json');
          break;
        case 'pa':
          translations = require('./locales/pa.json');
          break;
        case 'ur':
          translations = require('./locales/ur.json');
          break;
        // Locale aliases (regional variants)
        case 'en-GB':
        case 'en-AU':
        case 'en-CA':
          translations = require('./locales/en.json');
          break;
        case 'es-MX':
          translations = require('./locales/es.json');
          break;
        case 'pt-PT':
          translations = require('./locales/pt.json');
          break;
        case 'fr-CA':
          translations = require('./locales/fr.json');
          break;
        case 'ar-AE':
        case 'ar-EG':
          translations = require('./locales/ar.json');
          break;
        default:
          translations = require('./locales/en.json');
      }
    } catch (requireError) {
      console.warn(`⚠️ Language file ${languageCode}.json not found, using English fallback`);
      // Use English as fallback
      translations = require('./locales/en.json');
      // Update language code to 'en' so we don't try to load this again
      languageCode = 'en';
    }

    // Add resource bundle
    i18n.addResourceBundle(languageCode, 'translation', translations, true, true);

    console.log(`✅ Language file loaded: ${languageCode}`);
  } catch (error) {
    console.error(`❌ Error loading language file ${languageCode}:`, error);
    // Don't throw - just use English as ultimate fallback
    console.warn('⚠️ Using English as fallback language');
  }
};

/**
 * Change app language
 */
export const changeLanguage = async (languageCode: string) => {
  await loadUserLanguage(languageCode);
};

export default i18n;
