import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AvatarSelector } from '@/components/profile/AvatarSelector';
import { AvatarDisplay } from '@/components/profile/AvatarDisplay';
import { api, API_ENDPOINTS } from '@/utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { AvatarShape } from '@/utils/avatar';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { textAlign, flexDirection } = useLanguage();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [selectedShape, setSelectedShape] = useState<AvatarShape | null>(
    (user?.avatar_shape as AvatarShape) || null
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    user?.avatar_color || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setBio(user.bio || '');
      setSelectedShape((user.avatar_shape as AvatarShape) || null);
      setSelectedColor(user.avatar_color || null);
    }
  }, [user]);

  const handleAvatarSelect = (shape: AvatarShape, color: string) => {
    setSelectedShape(shape);
    setSelectedColor(color);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال الاسم');
      return;
    }

    if (bio.length > 100) {
      Alert.alert('خطأ', 'الوصف يجب أن يكون أقل من 100 حرف');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        full_name: fullName.trim(),
      };

      if (selectedShape && selectedColor) {
        updateData.avatar_shape = selectedShape;
        updateData.avatar_color = selectedColor;
      }

      if (bio.trim()) {
        updateData.bio = bio.trim();
      } else {
        updateData.bio = null;
      }

      const response = await api.put(API_ENDPOINTS.PROFILE_UPDATE, updateData);

      if (response && response.ok) {
        await refreshUser();
        Alert.alert('نجح', 'تم تحديث البروفايل بنجاح', [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(response?.error?.message || 'فشل تحديث البروفايل');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تحديث البروفايل');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={[styles.header, { flexDirection }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { textAlign }]}>تعديل البروفايل</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Avatar Preview */}
            <View style={styles.avatarPreviewContainer}>
              <AvatarDisplay
                shape={selectedShape || undefined}
                color={selectedColor || undefined}
                user={user || undefined}
                size={120}
              />
              <Text style={[styles.previewLabel, { textAlign }]}>معاينة</Text>
            </View>

            {/* Avatar Selector */}
            <AvatarSelector
              selectedShape={selectedShape || undefined}
              selectedColor={selectedColor || undefined}
              onSelect={handleAvatarSelect}
              size={80}
            />

            {/* Spacer between avatar selector and inputs */}
            <View style={styles.spacer} />

            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { textAlign }]}>الاسم الكامل</Text>
              <TextInput
                style={[styles.input, { textAlign: 'right' }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="أدخل اسمك الكامل"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>

            {/* Bio Input */}
            <View style={styles.inputContainer}>
              <View style={[styles.bioHeader, { flexDirection }]}>
                <Text style={[styles.inputLabel, { textAlign: 'right' }]}>الوصف الشخصي</Text>
                <Text style={styles.charCount}>{bio.length}/100</Text>
              </View>
              <TextInput
                style={[styles.bioInput, { textAlign: 'right' }]}
                value={bio}
                onChangeText={setBio}
                placeholder="أضف وصفاً عنك (اختياري)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                maxLength={100}
                numberOfLines={4}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#1B365D" />
              ) : (
                <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  spacer: {
    height: 32, // Space between avatar selector and input fields
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  input: {
    backgroundColor: 'rgba(60, 60, 67, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    textAlign: 'right',
  },
  bioInput: {
    backgroundColor: 'rgba(60, 60, 67, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    minHeight: 100,
    textAlignVertical: 'top',
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '700',
  },
});


