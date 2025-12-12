import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TrackProvider } from '@/contexts/TrackContext';
import '@/i18n/config';

// إخفاء جميع الـ warnings والأخطاء من الواجهة
LogBox.ignoreAllLogs(true);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

/**
 * Guard component للتحقق من المصادقة
 */
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // إخفاء شريط Development في Expo
  useEffect(() => {
    if (__DEV__) {
      // @ts-ignore
      global.__EXPO_HIDE_DEV_INDICATOR__ = true;
    }
  }, []);

  useEffect(() => {
    if (isLoading) return; // انتظر حتى ينتهي التحميل

    const inAuthGroup = segments[0] === '(tabs)';
    const inAuthPages = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'otp-login' || segments[0] === 'register-otp' || segments[0] === 'register-success';

    if (!isAuthenticated) {
      // المستخدم غير مسجل دخول
      if (inAuthGroup) {
        // يحاول الوصول لصفحة محمية
        router.replace('/login');
      }
      // إذا كان في صفحات تسجيل الدخول، اتركه
    } else {
      // المستخدم مسجل دخول
      if (inAuthPages) {
        // يحاول الوصول لصفحة تسجيل دخول أو تسجيل
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="register-otp" options={{ headerShown: false }} />
      <Stack.Screen name="register-success" options={{ headerShown: false }} />
      <Stack.Screen name="otp-login" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
      <Stack.Screen name="assessments" options={{ headerShown: false }} />
      <Stack.Screen name="multiplayer" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <AppProviders colorScheme={colorScheme === 'dark' ? 'dark' : 'light'} />
    </LanguageProvider>
  );
}

interface AppProvidersProps {
  colorScheme: 'light' | 'dark';
}

function AppProviders({ colorScheme }: AppProvidersProps) {
  const { isRTL } = useLanguage();

  return (
    <AuthProvider>
      <TrackProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={styles.appContainer}>
            <RootLayoutNav />
          </View>
          <StatusBar style="auto" />
        </ThemeProvider>
      </TrackProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    // RTL/LTR is handled globally by I18nManager
    // All text and layout will automatically respect the current direction
  },
});
