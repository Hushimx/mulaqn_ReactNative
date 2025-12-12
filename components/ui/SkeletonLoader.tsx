import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton presets for common UI elements
export const SkeletonCard = ({ style }: { style?: any }) => (
  <View style={[styles.card, style]}>
    <SkeletonLoader width={64} height={64} borderRadius={16} style={{ marginBottom: 12 }} />
    <SkeletonLoader width="80%" height={28} borderRadius={8} style={{ marginBottom: 8 }} />
    <SkeletonLoader width="60%" height={16} borderRadius={6} />
  </View>
);

export const SkeletonStatCard = ({ style }: { style?: any }) => (
  <View style={[styles.statCard, style]}>
    <SkeletonLoader width={64} height={64} borderRadius={16} style={{ marginBottom: 12 }} />
    <SkeletonLoader width="70%" height={32} borderRadius={8} style={{ marginBottom: 6 }} />
    <SkeletonLoader width="90%" height={14} borderRadius={6} style={{ marginBottom: 12 }} />
    <SkeletonLoader width="80%" height={36} borderRadius={20} />
  </View>
);

export const SkeletonTrackCard = ({ style }: { style?: any }) => (
  <View style={[styles.trackCard, style]}>
    <View style={styles.trackCardHeader}>
      <SkeletonLoader width={60} height={60} borderRadius={12} />
      <SkeletonLoader width={80} height={28} borderRadius={12} />
    </View>
    <SkeletonLoader width="90%" height={24} borderRadius={8} style={{ marginBottom: 8 }} />
    <SkeletonLoader width="100%" height={16} borderRadius={6} style={{ marginBottom: 16 }} />
    <View style={styles.trackCardStats}>
      <SkeletonLoader width={80} height={14} borderRadius={6} />
      <SkeletonLoader width={80} height={14} borderRadius={6} />
      <SkeletonLoader width={80} height={14} borderRadius={6} />
    </View>
    <SkeletonLoader width="100%" height={48} borderRadius={12} style={{ marginTop: 16 }} />
  </View>
);

export const SkeletonAssessmentCard = ({ style }: { style?: any }) => (
  <View style={[styles.assessmentCard, style]}>
    <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
    <SkeletonLoader width="80%" height={18} borderRadius={6} style={{ marginBottom: 8 }} />
    <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
    <SkeletonLoader width="60%" height={14} borderRadius={6} />
  </View>
);

export const SkeletonLessonHeader = ({ style }: { style?: any }) => (
  <View style={[styles.lessonHeader, style]}>
    <SkeletonLoader width="90%" height={24} borderRadius={8} style={{ marginBottom: 12 }} />
    <SkeletonLoader width={100} height={28} borderRadius={8} style={{ marginBottom: 16 }} />
    <View style={styles.metaRow}>
      <SkeletonLoader width={80} height={32} borderRadius={8} />
      <SkeletonLoader width={80} height={32} borderRadius={8} />
      <SkeletonLoader width={80} height={32} borderRadius={8} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  card: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    borderTopWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    alignItems: 'center',
  },
  trackCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  trackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackCardStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  assessmentCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  lessonHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});

