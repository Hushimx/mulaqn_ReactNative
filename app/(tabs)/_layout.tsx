import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useTrack } from '@/contexts/TrackContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { trackColors } = useTrack();

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
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="home" 
              size={24} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="search" 
              size={24} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tracks"
        options={{
          title: '',
          tabBarIcon: ({ focused, color }) => (
            <View style={[
              styles.centerTabContainer,
              { backgroundColor: trackColors.primary }
            ]}>
              <MaterialIcons 
                name="home" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: '',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="delete-outline" 
              size={24} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons 
              name="person-outline" 
              size={24} 
              color={focused ? '#D4AF37' : '#8FA4C0'} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTabContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 15,
    borderWidth: 3,
    borderColor: '#1B365D',
  },
});
