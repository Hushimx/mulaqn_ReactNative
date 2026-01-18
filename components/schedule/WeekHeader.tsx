import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

interface WeekData {
  week_start: string;
  week_end: string;
  days: any[];
  stats: {
    total: number;
    completed: number;
    skipped: number;
    failed: number;
    pending: number;
    completion_rate: number;
  };
}

interface WeekHeaderProps {
  weekData: WeekData;
  trackColor: string;
  onPrevious: () => void;
  onNext: () => void;
  flexDirection: 'row' | 'row-reverse';
  textAlign: 'left' | 'right' | 'center';
}

export function WeekHeader({
  weekData,
  trackColor,
  flexDirection,
  textAlign,
}: WeekHeaderProps) {

  const stats = [
    { value: weekData.stats.total, label: 'إجمالي', color: trackColor, icon: 'library-books' },
    { value: weekData.stats.completed, label: 'مكتمل', color: '#10B981', icon: 'check-circle' },
    { value: weekData.stats.skipped, label: 'مؤجل', color: '#F59E0B', icon: 'schedule' },
    { value: weekData.stats.failed, label: 'فاشل', color: '#EF4444', icon: 'close-circle' },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      {/* Compact Stats Only */}
      <View style={[styles.statsRow, { flexDirection }]}>
        {stats.map((stat, index) => (
          <Animated.View
            key={stat.label}
            entering={ZoomIn.duration(300).delay(50 + index * 50)}
            style={styles.statItem}
          >
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
              <MaterialIcons name={stat.icon as any} size={16} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { textAlign: 'center' }]}>
              {stat.label}
            </Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
});
