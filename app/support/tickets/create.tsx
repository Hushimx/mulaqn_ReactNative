import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

export default function CreateTicketScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isRTL, textAlign } = useLanguage();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  // إخفاء الـ header
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation])
  );

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post<{ ok: boolean; data: { ticket: any; message?: string } }>(
        API_ENDPOINTS.SUPPORT_TICKETS,
        {
          subject,
          description,
          category,
          priority,
        }
      );

      if (response?.ok && response.data?.ticket) {
        Alert.alert('نجح', response.data.message || 'تم إنشاء التذكرة بنجاح', [
          { text: 'حسناً', onPress: () => router.push(`/support/tickets/${response.data.ticket.id}`) },
        ]);
      } else {
        Alert.alert('خطأ', 'فشل إنشاء التذكرة');
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.title, { textAlign }]}>إنشاء تذكرة جديدة</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <MaterialIcons name="title" size={16} color="#D4AF37" /> الموضوع *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: مشكلة في الدفع"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <MaterialIcons name="category" size={16} color="#D4AF37" /> التصنيف
              </Text>
              <View style={styles.selectContainer}>
                {['general', 'technical', 'billing', 'content', 'account'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.selectOption, category === cat && styles.selectOptionActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.selectOptionText, category === cat && styles.selectOptionTextActive]}>
                      {cat === 'general' ? 'عام' : 
                       cat === 'technical' ? 'تقني' : 
                       cat === 'billing' ? 'دفع' : 
                       cat === 'content' ? 'محتوى' : 'حساب'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <MaterialIcons name="priority-high" size={16} color="#D4AF37" /> الأولوية
              </Text>
              <View style={styles.selectContainer}>
                {['low', 'normal', 'high', 'urgent'].map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    style={[styles.selectOption, priority === pri && styles.selectOptionActive]}
                    onPress={() => setPriority(pri)}
                  >
                    <Text style={[styles.selectOptionText, priority === pri && styles.selectOptionTextActive]}>
                      {pri === 'low' ? 'منخفضة' : 
                       pri === 'normal' ? 'عادية' : 
                       pri === 'high' ? 'عالية' : 'عاجلة'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <MaterialIcons name="description" size={16} color="#D4AF37" /> الوصف *
              </Text>
              <TextInput
                ref={descriptionInputRef}
                style={[styles.input, styles.textArea]}
                placeholder="اشرح مشكلتك بالتفصيل..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0F1419" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="#0F1419" />
                  <Text style={styles.submitButtonText}>إرسال التذكرة</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // مساحة إضافية للكيبورد
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#F8F9FA',
    fontSize: 16,
    fontFamily: 'Cairo',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectOptionActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  selectOptionText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '600',
  },
  selectOptionTextActive: {
    color: '#0F1419',
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0F1419',
    fontWeight: '700',
    fontSize: 16,
  },
});

