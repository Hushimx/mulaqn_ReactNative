import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
          height: Platform.OS === 'ios' ? 90 : 70,
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
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="search" 
              size={28} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'المتجر',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="shopping-cart" 
              size={28} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activeTabContainer : styles.inactiveTabContainer}>
              <MaterialIcons 
                name="home" 
                size={focused ? 36 : 28} 
                color={focused ? '#FFFFFF' : '#8FA4C0'} 
              />
            </View>
          ),
          tabBarLabel: ({ focused }) => focused ? '' : 'الرئيسية',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الملف',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="person" 
              size={28} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTabContainer: {
    backgroundColor: '#D4AF37',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
  },
  inactiveTabContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
