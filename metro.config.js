const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      // Polyfills for Node.js built-in modules
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      // Text encoding polyfills
      'text-encoding': require.resolve('text-encoding-polyfill'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
