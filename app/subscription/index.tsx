import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface UserSubscription {
  id: number;
  track: {
    id: number;
    name: string;
    code: string;
  };
  status: string;
  end_date: string | null;
  is_active: boolean;
  days_remaining: number | null;
}

export default function SubscriptionIndexScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tracks
      const tracksResponse = await api.get<{ ok: boolean; data: Track[] }>(API_ENDPOINTS.TRACKS);
      if (tracksResponse && tracksResponse.ok && tracksResponse.data) {
        setTracks(tracksResponse.data);
      }

      // Fetch user subscriptions
      try {
        const subsResponse = await api.get<{ ok: boolean; data: UserSubscription[] }>(
          API_ENDPOINTS.MY_SUBSCRIPTIONS
        );
        if (subsResponse && subsResponse.ok && subsResponse.data) {
          setSubscriptions(subsResponse.data);
        }
      } catch (err) {
        console.log('Subscriptions not available or user not logged in');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    router.push(`/subscription/${track.id}`);
  };

  const getTrackSubscription = (trackId: number): UserSubscription | undefined => {
    return subscriptions.find(sub => sub.track.id === trackId && sub.is_active);
  };

  const formatExpiryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTrackColor = (trackId: number) => {
    switch (trackId) {
      case 1: return '#10B981'; // قدرات - أخضر
      case 2: return '#3B82F6'; // تحصيلي - أزرق
      case 3: return '#8B5CF6'; // STEP - بنفسجي
      default: return '#D4AF37';
    }
  };

  const getTrackEmoji = (trackId: number) => {
    switch (trackId) {
      case 1: return '📚'; // قدرات
      case 2: return '🎓'; // تحصيلي
      case 3: return '🌍'; // STEP
      default: return '🤖';
    }
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الاشتراكات</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>اختر المسار للاشتراك</Text>
            <Text style={styles.subtitle}>
              اختر المسار الذي تريد الاشتراك فيه لبدء رحلتك التعليمية
            </Text>
          </View>

          {/* Tracks List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : (
            <View style={styles.tracksContainer}>
              {tracks.map((track) => {
                const trackColor = getTrackColor(track.id);
                const trackEmoji = getTrackEmoji(track.id);
                const subscription = getTrackSubscription(track.id);
                const isSubscribed = !!subscription;
                
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[
                      styles.trackCard, 
                      { borderColor: `${trackColor}40` },
                      isSubscribed && styles.subscribedCard,
                    ]}
                    onPress={() => !isSubscribed && handleTrackPress(track)}
                    activeOpacity={isSubscribed ? 1 : 0.8}
                  >
                    <View style={styles.trackHeader}>
                      <View style={[styles.trackIconContainer, { backgroundColor: `${trackColor}20` }]}>
                        <Text style={styles.trackEmoji}>{trackEmoji}</Text>
                      </View>
                      <View style={styles.trackInfo}>
                        <Text style={styles.trackName}>{track.name}</Text>
                        <Text style={styles.trackDescription}>
                          {track.description || 'ابدأ التحضير للاختبار الآن'}
                        </Text>
                      </View>
                      {isSubscribed ? (
                        <MaterialIcons name="check-circle" size={24} color={trackColor} />
                      ) : (
                        <MaterialIcons name="chevron-left" size={24} color={trackColor} />
                      )}
                    </View>

                    <View style={styles.trackFeatures}>
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color={trackColor} />
                        <Text style={styles.featureText}>محتوى تفاعلي</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color={trackColor} />
                        <Text style={styles.featureText}>تتبع تقدمك</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color={trackColor} />
                        <Text style={styles.featureText}>تقارير مفصلة</Text>
                      </View>
                    </View>

                    {isSubscribed && subscription ? (
                      <View style={[styles.activeSubscriptionBadge, { backgroundColor: `${trackColor}20`, borderColor: trackColor }]}>
                        <MaterialIcons name="verified" size={20} color={trackColor} />
                        <View style={styles.subscriptionInfo}>
                          <Text style={[styles.subscriptionStatus, { color: trackColor }]}>
                            مفعّل
                          </Text>
                          {subscription.end_date && (
                            <Text style={styles.subscriptionExpiry}>
                              حتى {formatExpiryDate(subscription.end_date)}
                            </Text>
                          )}
                          {subscription.days_remaining !== null && subscription.days_remaining > 0 && (
                            <Text style={styles.subscriptionDays}>
                              {subscription.days_remaining} يوم متبقي
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.subscribeButton, { backgroundColor: trackColor }]}
                        onPress={() => handleTrackPress(track)}
                      >
                        <Text style={styles.subscribeButtonText}>عرض الخطط</Text>
                        <MaterialIcons name="arrow-back" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={24} color="#D4AF37" />
            <Text style={styles.infoText}>
              جميع الاشتراكات تشمل تجربة مجانية لمدة 7 أيام. يمكنك الإلغاء في أي وقت.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  titleContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  tracksContainer: {
    gap: 16,
    marginBottom: 24,
  },
  trackCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    gap: 16,
  },
  subscribedCard: {
    opacity: 0.9,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackEmoji: {
    fontSize: 32,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
  },
  trackDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textAlign: 'right',
  },
  trackFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  infoText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  activeSubscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  subscriptionInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  subscriptionStatus: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subscriptionExpiry: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginBottom: 2,
  },
  subscriptionDays: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
});

