// Prevent Expo from using the monorepo workspace root as Metro's server root.
// Without this, Expo detects clinicfact/ as the workspace root and resolves
// the entry file from there instead of apps/mobile/.
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';
