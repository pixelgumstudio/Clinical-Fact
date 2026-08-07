# Runtime Error Fix Guide

## Error: "Cannot convert undefined value to object"

This error occurs during app initialization and is typically caused by:
1. Metro bundler cache corruption
2. Module initialization issues
3. Babel configuration problems with React 19

## Quick Fix (Try First)

### Option 1: Clear Cache and Restart

```bash
# Stop all Metro processes
taskkill /F /IM node.exe

# Clear all caches
npx expo start --clear

# If that doesn't work, run these commands:
rm -rf node_modules/.cache
rm -rf .expo
npm start
```

### Option 2: Full Reset

```bash
# 1. Stop Metro
taskkill /F /IM node.exe

# 2. Clear caches
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ../../node_modules/.cache

# 3. Reinstall dependencies (from root)
cd ../..
npm install

# 4. Start fresh
cd apps/mobile
npm start
```

## Root Cause Analysis

The error `[runtime not ready]: TypeError: Cannot convert undefined value to object` suggests one of these issues:

### 1. React 19 Compatibility
Your app uses React 19.1.0 which is very new. Some packages may not be fully compatible.

**Check:** Look for console warnings about deprecated lifecycle methods or prop types.

### 2. Import Cycle
A circular dependency between modules can cause undefined exports.

**Check:** Look for imports that reference each other circularly:
- `authStore` → `api` → `authStore` ❌
- Components importing from each other in a loop

### 3. Undefined Export
A component is trying to use an export that doesn't exist.

**Check:** Common culprits:
- Missing icon exports
- Undefined design system components
- Missing type exports

## Specific Fixes

### Fix 1: Metro Bundler Cache

Run this command:
```bash
npx expo start --clear --reset-cache
```

### Fix 2: Watchman Cache (if on Mac/Linux)

```bash
watchman watch-del-all
```

### Fix 3: Update Babel Config

Check `babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      ['@babel/plugin-proposal-private-methods', { loose: true }],
    ],
  };
};
```

### Fix 4: Check for Problematic Imports

Look for imports like:
```typescript
import { something } from 'package'; // might be undefined
```

Debug by adding:
```typescript
import * as Package from 'package';
console.log('Package exports:', Object.keys(Package));
```

### Fix 5: Verify Icon Exports

The app uses many icons from the design system. Verify they're all exported:

```typescript
// In packages/design-system/src/icons/index.ts
// Make sure all icons used in the app are exported
```

## Debug Mode

To get more information about the error:

1. **Enable Better Error Messages:**

Add to `App.tsx`:
```typescript
import { LogBox } from 'react-native';

// Show all errors
LogBox.ignoreAllLogs(false);

// Add error boundary
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('Global Error:', error, 'Fatal:', isFatal);
});
```

2. **Check Module Loading:**

Add to entry point:
```typescript
console.log('=== MODULE LOAD ORDER ===');
console.log('1. React:', typeof React);
console.log('2. Zustand:', typeof create);
console.log('3. Design System:', typeof colors);
```

3. **Enable Verbose Logging:**

```bash
EXPO_DEBUG=true npm start
```

## Still Not Working?

### Step 1: Isolate the Problem

Comment out imports one by one in `App.tsx`:

```typescript
// import { AppNavigator } from './src/navigation/AppNavigator'; // TEMP DISABLED
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // TEMP DISABLED

export default function App() {
  return (
    <SafeAreaProvider>
      <Text>Test</Text> {/* Does this work? */}
    </SafeAreaProvider>
  );
}
```

### Step 2: Check Dependencies

Verify all peer dependencies are installed:

```bash
npm ls @react-navigation/native
npm ls react-native-safe-area-context
npm ls zustand
```

### Step 3: Check for Version Conflicts

```bash
npm ls react
npm ls react-native
```

Should show consistent versions across all packages.

### Step 4: Nuclear Option

```bash
# From project root
rm -rf node_modules
rm -rf apps/mobile/node_modules
rm -rf packages/*/node_modules
rm package-lock.json

# Reinstall everything
npm install

# Clear caches
cd apps/mobile
rm -rf .expo
rm -rf node_modules/.cache

# Start fresh
npx expo start --clear
```

## Common Solutions by Symptom

### "Object is undefined"
- **Cause:** Import that doesn't exist
- **Fix:** Check all imports, verify exports

### "Cannot read property 'X' of undefined"
- **Cause:** Accessing property before initialization
- **Fix:** Add optional chaining (?.) or null checks

### Error only on first load
- **Cause:** Race condition in async initialization
- **Fix:** Add loading state, wait for all stores to initialize

### Error after code change
- **Cause:** Hot reload issue
- **Fix:** Hard reload (Cmd+R or Ctrl+R)

## Prevention

To avoid this in the future:

1. **Always use optional chaining for imports:**
   ```typescript
   const value = store?.getValue() ?? defaultValue;
   ```

2. **Initialize stores properly:**
   ```typescript
   // Wait for all stores to be ready
   await Promise.all([
     authStore.loadAuth(),
     onboardingStore.loadStatus()
   ]);
   ```

3. **Use error boundaries:**
   ```typescript
   <ErrorBoundary fallback={<ErrorScreen />}>
     <App />
   </ErrorBoundary>
   ```

4. **Test after dependency updates:**
   ```bash
   npm install
   npx expo start --clear
   ```

## Getting Help

If none of these work, gather this info:

1. **Exact error message** (from console)
2. **Steps to reproduce**
3. **Recent changes** (git diff)
4. **Environment:**
   ```bash
   npx expo-doctor
   ```

Then open an issue or ask for help with all this information.
