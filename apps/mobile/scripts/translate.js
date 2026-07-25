/**
 * Translation Script using Google Translate API
 *
 * This script translates the English (en.json) file to all supported languages.
 * Run once to generate all translation files, then use i18next to serve them.
 *
 * Usage:
 *   node scripts/translate.js
 *
 * Requirements:
 *   - GOOGLE_TRANSLATE_API_KEY environment variable
 *   - @google-cloud/translate package
 */

const fs = require('fs');
const path = require('path');

// Supported languages (20 languages)
const LANGUAGES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  it: 'Italian',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
};

/**
 * Translate text using Google Translate API
 */
async function translateText(text, targetLang) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: GOOGLE_TRANSLATE_API_KEY or GEMINI_API_KEY environment variable not set');
    console.log('\n💡 To use Google Translate API:');
    console.log('   1. Get an API key from https://console.cloud.google.com/');
    console.log('   2. Set it: export GOOGLE_TRANSLATE_API_KEY="your-key"');
    console.log('   3. Or add to .env file\n');
    process.exit(1);
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Translation API error: ${error}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error(`Translation error for "${text}" to ${targetLang}:`, error.message);
    return text; // Return original text if translation fails
  }
}

/**
 * Recursively translate an object
 */
async function translateObject(obj, targetLang, depth = 0) {
  const translated = {};
  const entries = Object.entries(obj);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];

    if (typeof value === 'string') {
      // Don't translate placeholder variables like {{current}}
      if (value.includes('{{') && value.includes('}}')) {
        translated[key] = value; // Keep placeholders as-is
        console.log(`  ${'  '.repeat(depth)}├─ ${key}: [placeholder kept]`);
      } else {
        const translatedText = await translateText(value, targetLang);
        translated[key] = translatedText;
        console.log(`  ${'  '.repeat(depth)}├─ ${key}: "${value}" → "${translatedText}"`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } else if (typeof value === 'object' && value !== null) {
      console.log(`  ${'  '.repeat(depth)}├─ ${key}:`);
      translated[key] = await translateObject(value, targetLang, depth + 1);
    } else {
      translated[key] = value;
    }
  }

  return translated;
}

/**
 * Main translation function
 */
async function translateAll() {
  const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
  const enPath = path.join(localesDir, 'en.json');

  // Check if English file exists
  if (!fs.existsSync(enPath)) {
    console.error('❌ Error: en.json not found at', enPath);
    process.exit(1);
  }

  // Load English translations
  const englishTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  console.log('✅ Loaded English translations\n');

  // Translate to each language
  const languages = Object.entries(LANGUAGES);

  for (let i = 0; i < languages.length; i++) {
    const [langCode, langName] = languages[i];

    console.log(`\n🌍 Translating to ${langName} (${langCode})... [${i + 1}/${languages.length}]`);
    console.log('─'.repeat(60));

    try {
      const translated = await translateObject(englishTranslations, langCode);

      // Save to file
      const outputPath = path.join(localesDir, `${langCode}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2), 'utf8');

      console.log(`\n✅ Saved ${langCode}.json`);
    } catch (error) {
      console.error(`\n❌ Failed to translate ${langName}:`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✨ Translation complete!');
  console.log(`📁 Generated ${languages.length} translation files in:`);
  console.log(`   ${localesDir}`);
  console.log('═'.repeat(60) + '\n');
}

// Run the translation
translateAll().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
