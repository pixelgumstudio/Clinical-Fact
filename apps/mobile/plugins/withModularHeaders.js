const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds `use_modular_headers!` to the generated iOS Podfile.
 * Required because AppCheckCore (from @react-native-google-signin) is a Swift pod
 * that depends on GoogleUtilities and RecaptchaInterop, which need module maps
 * to be importable from Swift when built as static libraries.
 */
function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('use_modular_headers!')) {
        // Insert after the platform declaration line
        contents = contents.replace(
          /(platform :ios[^\n]*\n)/,
          '$1\nuse_modular_headers!\n'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
}

module.exports = withModularHeaders;
