import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SavedQuestionsStatsProps {
  totalSaved: number;
  pinnedCount: number;
  lastAdded?: string;
}

export const SavedQuestionsStats: React.FC<SavedQuestionsStatsProps> = ({
  totalSaved,
  pinnedCount,
  lastAdded,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'لا يوجد';
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset time to start of day for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const questionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate difference in days
    const diffTime = today.getTime() - questionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'قبل أسبوع' : `قبل ${weeks} أسابيع`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'قبل شهر' : `قبل ${months} أشهر`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'قبل سنة' : `قبل ${years} سنوات`;
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <BlurView intensity={20} tint="dark" style={[styles.statCard, { borderColor: '#10B98140' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#3A3A3C' }]}>
            <MaterialIcons name="bookmark" size={24} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{totalSaved}</Text>
          <Text style={styles.statLabel}>سؤال محفوظ</Text>
        </BlurView>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <BlurView intensity={20} tint="dark" style={[styles.statCard, { borderColor: '#D4AF3740' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#3A3A3C' }]}>
            <MaterialIcons name="push-pin" size={24} color="#D4AF37" />
          </View>
          <Text style={[styles.statValue, { color: '#D4AF37' }]}>{pinnedCount}</Text>
          <Text style={styles.statLabel}>مثبت</Text>
        </BlurView>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <BlurView intensity={20} tint="dark" style={[styles.statCard, { borderColor: '#3B82F640' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#3A3A3C' }]}>
            <MaterialIcons name="schedule" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValueSmall}>{formatDate(lastAdded)}</Text>
          <Text style={styles.statLabel}>آخر إضافة</Text>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8FA4C0',
    textAlign: 'center',
  },
});

