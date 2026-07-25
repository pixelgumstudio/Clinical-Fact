// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Limit parallel workers to reduce heap usage
config.maxWorkers = 2;

// 1. Watch all files within the monorepo (spread expo defaults first)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  // Include nested node_modules for packages that bundle their own deps
  path.resolve(workspaceRoot, 'node_modules/@superwall/react-native-superwall/node_modules'),
];

// 2b. Handle workspace package resolution for @clinicfact/*
const extraNodeModules = {};
const packages = ['design-system', 'types', 'shared', 'validation'];
packages.forEach(pkg => {
  extraNodeModules[`@clinicfact/${pkg}`] = path.resolve(workspaceRoot, `packages/${pkg}`);
});
config.resolver.extraNodeModules = extraNodeModules;

// 3. Custom resolver to handle the entry point in monorepo
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If trying to import Expo's default AppEntry, redirect to our custom index.js
  if (moduleName.includes('expo/AppEntry') || moduleName === './node_modules/expo/AppEntry') {
    return {
      filePath: path.join(projectRoot, 'index.js'),
      type: 'sourceFile',
    };
  }

  // If the default AppEntry is trying to import ../../App, redirect to our App
  if (moduleName === '../../App' && context.originModulePath && context.originModulePath.replace(/\\/g, '/').includes('expo/AppEntry')) {
    return {
      filePath: path.join(projectRoot, 'App.tsx'),
      type: 'sourceFile',
    };
  }

  // Handle @clinicfact workspace packages - resolve from source
  if (moduleName.startsWith('@clinicfact/')) {
    const packageName = moduleName.replace('@clinicfact/', '');
    const packagePath = path.resolve(workspaceRoot, `packages/${packageName}`);
    try {
      return originalResolveRequest(
        { ...context, originModulePath: context.originModulePath },
        packagePath,
        platform
      );
    } catch (e) {
      // Fall through to default resolver
    }
  }

  // Otherwise use default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
