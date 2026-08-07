import { registerRootComponent } from 'expo';

// Polyfill for PlatformConstants - intercept TurboModuleRegistry before any modules load
const TurboModuleRegistry = require('react-native').TurboModuleRegistry;
const originalGetEnforcing = TurboModuleRegistry.getEnforcing;

TurboModuleRegistry.getEnforcing = function(name) {
  if (name === 'PlatformConstants') {
    // Return a polyfill for Expo Go environments
    return {
      OS: 'ios',
      reactNativeVersion: { major: 0, minor: 72, patch: 0, prerelease: null },
      forceTouchAvailable: false,
      layoutAnimationNativeDriver: true,
      isTesting: false,
    };
  }
  return originalGetEnforcing.call(this, name);
};

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
