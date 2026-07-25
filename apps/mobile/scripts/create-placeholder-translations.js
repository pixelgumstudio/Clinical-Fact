/**
 * Create Placeholder Translation Files
 *
 * This script creates placeholder translation files using English text.
 * Use this temporarily until you run the full translation script with Google Translate API.
 *
 * Usage: node scripts/create-placeholder-translations.js
 */

const fs = require('fs');
const path = require('path');

// Supported languages (20 languages)
const LANGUAGES = [
  'es', 'fr', 'de', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko',
  'ar', 'hi', 'ru', 'it', 'pl', 'nl', 'sv', 'tr', 'vi', 'th', 'id'
];

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');

// Check if English file exists
if (!fs.existsSync(enPath)) {
  console.error('❌ Error: en.json not found at', enPath);
  process.exit(1);
}

// Load English translations
const englishContent = fs.readFileSync(enPath, 'utf8');
console.log('✅ Loaded English translations\n');

// Create placeholder files for each language
let created = 0;
let skipped = 0;

LANGUAGES.forEach(langCode => {
  const outputPath = path.join(localesDir, `${langCode}.json`);

  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipped ${langCode}.json (already exists)`);
    skipped++;
  } else {
    fs.writeFileSync(outputPath, englishContent, 'utf8');
    console.log(`✅ Created ${langCode}.json (placeholder with English text)`);
    created++;
  }
});

console.log('\n' + '═'.repeat(60));
console.log('✨ Placeholder creation complete!');
console.log(`📁 Created: ${created} files, Skipped: ${skipped} files`);
console.log(`📂 Location: ${localesDir}`);
console.log('\n💡 Note: These are placeholders with English text.');
console.log('   To get actual translations, run:');
console.log('   export GOOGLE_TRANSLATE_API_KEY="your-key"');
console.log('   node scripts/translate.js');
console.log('═'.repeat(60) + '\n');
