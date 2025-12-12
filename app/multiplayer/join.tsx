import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function MultiplayerJoinScreen() {
  const router = useRouter();
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const trackIdNum = parseInt(trackId || '1');
  const colors = getTrackColors(trackIdNum) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };

  const handleJoin = async () => {
    if (!sessionCode.trim() || sessionCode.length !== 6) {
      Alert.alert('خطأ', 'يرجى إدخال كود الجلسة (6 أحرف)');
      return;
    }

    if (loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const response = await api.post<{
        ok: boolean;
        data: { session_id: number; participants: any[]; status: string };
      }>(API_ENDPOINTS.MULTIPLAYER_JOIN, {
        session_code: sessionCode.toUpperCase(),
      });

      if (response && response.ok && response.data) {
        router.push({
          pathname: '/multiplayer/waiting',
          params: {
            sessionId: response.data.session_id.toString()
          }
        });
      } else {
        Alert.alert('خطأ', 'فشل الانضمام للجلسة');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الانضمام للجلسة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons
              name={flexDirection === 'row-reverse' ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.title}>انضمام للجلسة</Text>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.inputContainer}>
            <Text style={styles.label}>أدخل كود الجلسة</Text>
            <TextInput
              style={styles.input}
              value={sessionCode}
              onChangeText={(text) => setSessionCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.hint}>انسخ الكود من صديقك وأدخله هنا</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)}>
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor: colors.primary },
                (!sessionCode.trim() || loading) && styles.joinButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={!sessionCode.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="login" size={24} color="#FFFFFF" />
                  <Text style={styles.joinButtonText}>انضمام</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

