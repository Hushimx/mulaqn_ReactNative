import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

export default function TabBarBackground() {
  return (
    <ImageBackground
      source={require('@/assets/images/tabs_bg.png')}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
