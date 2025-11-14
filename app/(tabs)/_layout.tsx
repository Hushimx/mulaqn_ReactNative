import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#8FA4C0',
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
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
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'استكشف',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Image
                source={require('@/assets/images/tab_icons/search.png')}
                style={styles.icon}
                resizeMode="contain"
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
              <Image
                source={require('@/assets/images/tab_icons/cart.png')}
                style={styles.icon}
                resizeMode="contain"
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
            <View style={styles.HomePageContainer}>
              <Image
                source={require('@/assets/images/tab_icons/home.png')}
                style={styles.homeIcon}
                resizeMode="contain"
              />
            </View>
          ),
          tabBarLabel: ({ focused }) => focused ? '' : 'الرئيسية',
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'الدروس',
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Image
                source={require('@/assets/images/tab_icons/linear.png')}
                style={styles.icon}
                resizeMode="contain"
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
              <Image
                source={require('@/assets/images/tab_icons/user.png')}
                style={styles.icon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    marginTop: 0, // جعل الأيقونات أسفل قليلاً
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 19,
    height: 19,
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
});
