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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isFirstTime } from '@/utils/firstTimeUser';
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
    const inPublicPages = segments[0] === 'welcome' || segments[0] === 'track-selection';
    const isInitialLoad = segments.length === 0 || !segments[0];

    if (!isAuthenticated) {
      // المستخدم غير مسجل دخول
      if (inAuthGroup) {
        // يحاول الوصول لصفحة محمية
        router.replace('/login');
      } else if (isInitialLoad || (!inAuthPages && !inPublicPages)) {
        // عند بدء التطبيق أو في صفحة غير معروفة
        // تحقق من أول مرة
        isFirstTime().then((firstTime) => {
          if (firstTime) {
            router.replace('/welcome');
          } else {
            router.replace('/login');
          }
        });
      }
      // إذا كان في صفحات تسجيل الدخول أو public pages، اتركه
    } else {
      // المستخدم مسجل دخول
      if (inAuthPages || inPublicPages) {
        // يحاول الوصول لصفحة تسجيل دخول أو public page
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen 
        name="track-selection" 
        options={{ 
          headerShown: false,
          animationTypeForReplace: 'push',
          animation: 'slide_from_left', // Slide from left (comes from right in RTL)
        }} 
      />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="register-otp" options={{ headerShown: false }} />
      <Stack.Screen name="register-success" options={{ headerShown: false }} />
      <Stack.Screen name="otp-login" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
      <Stack.Screen name="assessments" options={{ headerShown: false }} />
      <Stack.Screen name="multiplayer" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="lessons" options={{ headerShown: false }} />
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    // RTL/LTR is handled globally by I18nManager
    // All text and layout will automatically respect the current direction
  },
});
