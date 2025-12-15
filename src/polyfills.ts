/**
 * Polyfills for React Native to support matrix-js-sdk
 * These are automatically included in Expo but need to be manually set up in bare React Native
 */

// Declare global for TypeScript
declare const global: any;

// 1. Crypto polyfill - MUST be imported first
import 'react-native-get-random-values';

// 2. Buffer polyfill
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// 3. Text encoding polyfills
import '@stardazed/streams-text-encoding';

// 4. Promise.withResolvers polyfill for Hermes (ES2024 feature used by matrix-js-sdk)
if (typeof (Promise as any).withResolvers !== 'function') {
  (Promise as any).withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

// 5. Process polyfill (needed by some Node.js modules)
if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    version: '',
    versions: {},
    platform: 'react-native',
    nextTick: (fn: () => void) => setTimeout(fn, 0),
  };
}

