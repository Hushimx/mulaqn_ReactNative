import { ExpoEventSource } from '@falcondev-oss/expo-event-source-polyfill';
// @ts-expect-error: This is used internally and is the recommended way to polyfill global objects
import { polyfillGlobal } from 'react-native/Libraries/Utilities/PolyfillFunctions';

// Polyfill EventSource globally
polyfillGlobal('EventSource', () => ExpoEventSource);

// Import expo-router entry point
import 'expo-router/entry';
