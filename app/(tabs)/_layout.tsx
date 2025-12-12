import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Tabs, usePathname, useSegments } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTrack } from '@/contexts/TrackContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TabLayout() {
  const { setCurrentTrack } = useTrack();
  const pathname = usePathname();
  const segments = useSegments();

  // Reset track context when navigating to main tabs
  useEffect(() => {
    // إذا كنا في أي من التابات الرئيسية (وليس داخل track أو assessment)
    // نبقي الـ track context نشط أثناء الـ assessments لأنها جزء من تجربة الـ track
    if (pathname) {
      if (pathname.includes('/tracks/') && !pathname.includes('/assessments/') && !pathname.includes('/lessons/')) {
        // نحن في صفحة track - استخرج track ID من pathname
        const trackMatch = pathname.match(/\/tracks\/(\d+)/);
        if (trackMatch && trackMatch[1]) {
          const trackId = parseInt(trackMatch[1]);
          setCurrentTrack(trackId);
        }
      } else if (!pathname.includes('/tracks/') && 
                 !pathname.includes('/assessments/') &&
                 !pathname.includes('/lessons/')) {
        // نحن في صفحة رئيسية - نمسح الـ track
        setCurrentTrack(null);
      }
      // إذا كنا في assessments أو lessons، لا نفعل شيء (نحتفظ بالـ track الحالي)
    }
  }, [pathname, setCurrentTrack]);

  // التحقق إذا كنا في الصفحة الرئيسية لإخفاء النصوص
  // في صفحة الرئيسية فقط، نعرض الأيقونات بدون نص
  const isHomePage = useMemo(() => {
    // استخدام segments للحصول على المسار الحالي بدقة
    const currentRoute = segments[segments.length - 1] || '';
    
    // إذا كان segments فارغ أو يحتوي على 'index' فقط أو pathname يشير للرئيسية
    return (
      currentRoute === 'index' || 
      currentRoute === '' ||
      pathname === '/(tabs)' || 
      pathname === '/(tabs)/' || 
      pathname === '/(tabs)/index' ||
      (pathname && pathname.startsWith('/(tabs)') && 
       !pathname.includes('/explore') && 
       !pathname.includes('/shop') && 
       !pathname.includes('/bookmarks') && 
       !pathname.includes('/profile') && 
       !pathname.includes('/lessons') && 
       !pathname.includes('/tracks'))
    );
  }, [pathname, segments]);

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#8FA4C0',
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarShowLabel: !isHomePage, // إخفاء النصوص في صفحة الرئيسية فقط
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 80, // نفس الارتفاع من Union.svg
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="support"
        options={{
          title: 'مساعدة',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconGlow} />}
              <MaterialIcons 
                name="support-agent" 
                size={19} 
                color={focused ? '#D4AF37' : '#8FA4C0'} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'المتجر',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconGlow} />}
              <Image
                source={require('@/assets/images/tab_icons/cart.png')}
                style={[
                  styles.icon,
                  { opacity: focused ? 1 : 0.6 }
                ]}
                resizeMode="contain"
                tintColor={focused ? '#D4AF37' : '#8FA4C0'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.HomePageContainer,
              focused && styles.HomePageContainerFocused
            ]}>
              <Image
                source={require('@/assets/images/tab_icons/home.png')}
                style={styles.homeIcon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'الدروس',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconGlow} />}
              <Image
                source={require('@/assets/images/tab_icons/linear.png')}
                style={[
                  styles.icon,
                  { opacity: focused ? 1 : 0.6 }
                ]}
                resizeMode="contain"
                tintColor={focused ? '#D4AF37' : '#8FA4C0'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'محفوظات',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconGlow} />}
              <MaterialIcons 
                name="bookmark" 
                size={19} 
                color={focused ? '#D4AF37' : '#8FA4C0'} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الملف',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.iconGlow} />}
              <Image
                source={require('@/assets/images/tab_icons/user.png')}
                style={[
                  styles.icon,
                  { opacity: focused ? 1 : 0.6 }
                ]}
                resizeMode="contain"
                tintColor={focused ? '#D4AF37' : '#8FA4C0'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tracks"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    marginTop: 0, // جعل الأيقونات أسفل قليلاً
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: 40,
    height: 40,
  },
  icon: {
    width: 19,
    height: 19,
    zIndex: 1,
  },
  iconGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    opacity: 0.2,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 0,
  },
  homeIcon: {
    width: 24,
    height: 24,
  },
  HomePageContainer: {
    position: 'absolute',
    top: -2,
    left: -10,
    backgroundColor: '#D4AF37',
    borderRadius: 35,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -35,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 15,
  },
  HomePageContainerFocused: {
    // زيادة التأثير المشع للصفحة الرئيسية عند التركيز
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 20,
  },
});
