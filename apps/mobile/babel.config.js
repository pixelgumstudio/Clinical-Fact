module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // Enable loose mode for class properties to avoid read-only property errors
          jsxImportSource: "react",
          lazyImports: true,
        },
      ],
    ],
    plugins: [
      // Required for React 19 compatibility with React Native
      "@babel/plugin-transform-export-namespace-from",
      // Note: Removed duplicate class properties plugins as they're already in babel-preset-expo
      // The preset handles them with the correct configuration
      "react-native-reanimated/plugin", //ADD THIS
    ],
  };
};
