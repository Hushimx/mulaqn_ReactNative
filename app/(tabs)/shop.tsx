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
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { SkeletonTrackCard } from '@/components/ui/SkeletonLoader';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
}


export default function ShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { textAlign, flexDirection } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: Track[] }>(
        API_ENDPOINTS.TRACKS
      );
      if (response && response.ok && response.data) {
        setTracks(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching tracks:', error);
      // Error is handled silently - empty state will show
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Navigate to subscription page
    router.push(`/subscription/${track.id}`);
  };


  const getTrackColor = (trackId: number) => {
    const colors = getTrackColors(trackId);
    return colors.primary;
  };

  if (loading) {
    return (
      <GradientBackground>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>المتجر</Text>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <SkeletonTrackCard />
            <SkeletonTrackCard />
            <SkeletonTrackCard />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerContent, { flexDirection }]}>
            <MaterialIcons name="store" size={28} color="#D4AF37" />
            <Text style={[styles.headerTitle, { textAlign }]}>المتجر</Text>
          </View>
          <Text style={[styles.headerSubtitle, { textAlign }]}>اختر مسارك وابدأ رحلتك التعليمية</Text>
        </View>

        {/* Tracks List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>لا توجد مسارات متاحة حالياً</Text>
            </View>
          ) : (
            tracks.map((track, index) => {
              const trackColor = getTrackColor(track.id);
              return (
                <Animated.View
                  key={track.id}
                  style={{
                    opacity: loading ? 0 : 1,
                    transform: [
                      {
                        translateY: loading ? 20 : 0,
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.trackCard, { borderColor: `${trackColor}40` }]}
                    onPress={() => handleTrackPress(track)}
                    activeOpacity={0.8}
                  >
                  <View style={[styles.trackCardHeader, { flexDirection }]}>
                    <View style={[styles.trackIconContainer, { backgroundColor: `${trackColor}20` }]}>
                      <MaterialIcons name="school" size={32} color={trackColor} />
                    </View>
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackName, { textAlign }]}>{track.name}</Text>
                      {track.description && (
                        <Text style={[styles.trackDescription, { textAlign }]} numberOfLines={2}>
                          {track.description}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons 
                      name={flexDirection === 'row-reverse' ? "arrow-back-ios" : "arrow-forward-ios"} 
                      size={20} 
                      color="rgba(255, 255, 255, 0.6)" 
                    />
                  </View>
                  
                  <View style={styles.trackFooter}>
                    <View style={[styles.viewPlansButton, { 
                      backgroundColor: `${trackColor}15`,
                      flexDirection
                    }]}>
                      <Text style={[styles.viewPlansText, { color: trackColor }]}>
                        عرض الخطط
                      </Text>
                      <MaterialIcons 
                        name={flexDirection === 'row-reverse' ? "arrow-forward" : "arrow-back"} 
                        size={18} 
                        color={trackColor} 
                      />
                    </View>
                  </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
      </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 16,
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  trackCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginRight: 0,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  trackFooter: {
    marginTop: 8,
  },
  viewPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewPlansText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
