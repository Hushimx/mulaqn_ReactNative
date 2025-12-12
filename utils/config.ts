import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configuration utility - يحمل الإعدادات من environment variables
 */

// الحصول على environment variables من Expo
const getEnvVar = (key: string, defaultValue: string): string => {
  // في Expo، environment variables تأتي من app.json أو .env
  // يمكن استخدام Constants.expoConfig?.extra
  const value = Constants.expoConfig?.extra?.[key] || process.env[key];
  return value || defaultValue;
};

// Build API Base URL
const buildApiBaseUrl = (): string => {
  const apiUrl = getEnvVar('API_BASE_URL', '');
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // Fallback للـ development
  if (!__DEV__) {
    return 'https://your-production-domain.com/api';
  }
  
  // للـ iOS Simulator: localhost يعمل
  if (Platform.OS === 'ios') {
    return 'http://192.168.1.36:8000/api'; // IP الماك
  }
  
  // للـ Android Emulator: 10.0.2.2 يعمل
  // للـ Android الجهاز الحقيقي: استخدم IP الماك
  return 'http://192.168.1.36:8000/api'; // IP الماك
};

// Build WebSocket URL
const buildWebSocketUrl = (): string => {
  const wsUrl = getEnvVar('WEBSOCKET_URL', '');
  const wsPort = getEnvVar('WEBSOCKET_PORT', '8080');
  
  if (wsUrl) {
    return wsUrl;
  }
  
  // Fallback للـ development
  if (!__DEV__) {
    return 'wss://your-production-domain.com';
  }
  
  // للـ development، استخدم نفس IP الـ API
  if (Platform.OS === 'ios') {
    return `ws://192.168.1.36:${wsPort}`;
  }
  
  return `ws://192.168.1.36:${wsPort}`;
};

export const config = {
  API_BASE_URL: buildApiBaseUrl(),
  WEBSOCKET_URL: buildWebSocketUrl(),
  WEBSOCKET_PORT: getEnvVar('WEBSOCKET_PORT', '8080'),
  REVERB_APP_KEY: getEnvVar('REVERB_APP_KEY', 'reverb-app-key'), // Default for development
  IS_DEV: __DEV__,
};

