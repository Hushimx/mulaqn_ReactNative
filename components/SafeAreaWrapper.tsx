import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
}

export default function SafeAreaWrapper({
  children,
  backgroundColor = '#0F1419',
  style,
}: SafeAreaWrapperProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});


