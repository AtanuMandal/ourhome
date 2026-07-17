module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    // Reanimated 4 moved its babel transform into react-native-worklets; the old
    // 'react-native-reanimated/plugin' name is deprecated on SDK 54, where
    // babel-preset-expo already knows how to wire the worklets plugin.
    plugins: ['react-native-worklets/plugin'],
  };
};
