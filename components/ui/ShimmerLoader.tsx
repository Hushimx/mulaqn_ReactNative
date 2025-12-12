import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function ShimmerLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: ShimmerLoaderProps) {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-1, -0.5, 0, 0.5, 1],
      [0.3, 0.5, 0.8, 0.5, 0.3],
      Extrapolate.CLAMP
    );

    const translateXValue = interpolate(
      translateX.value,
      [-1, 1],
      [-300, 300]
    );

    return {
      opacity,
      transform: [{ translateX: translateXValue }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
}

export function ShimmerCircle({
  size = 60,
  style,
}: {
  size?: number;
  style?: any;
}) {
  return (
    <ShimmerLoader
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

export function ShimmerCard({ style }: { style?: any }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <ShimmerCircle size={56} />
        <View style={styles.cardTitleContainer}>
          <ShimmerLoader width={120} height={18} style={{ marginBottom: 8 }} />
          <ShimmerLoader width={80} height={14} />
        </View>
      </View>
      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <ShimmerLoader width={60} height={24} style={{ marginBottom: 4 }} />
          <ShimmerLoader width={80} height={12} />
        </View>
        <View style={styles.cardStat}>
          <ShimmerLoader width={60} height={24} style={{ marginBottom: 4 }} />
          <ShimmerLoader width={80} height={12} />
        </View>
      </View>
      <ShimmerLoader width="100%" height={12} borderRadius={6} />
    </View>
  );
}

export function ShimmerRow({ style }: { style?: any }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.rowContent}>
        <ShimmerLoader width="60%" height={16} style={{ marginBottom: 8 }} />
        <ShimmerLoader width="40%" height={14} />
      </View>
      <View style={styles.rowRight}>
        <ShimmerLoader width={50} height={20} style={{ marginBottom: 4 }} />
        <ShimmerLoader width={40} height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
  },
  cardStat: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
});

