/**
 * @format
 */

// Import ALL polyfills FIRST before any other imports
// This is critical for matrix-js-sdk to work in React Native
import './src/polyfills';


// Polyfill for Promise.withResolvers (not available in React Native's JavaScriptCore)
if (typeof Promise.withResolvers === 'undefined') {
    Promise.withResolvers = function () {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
  

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
