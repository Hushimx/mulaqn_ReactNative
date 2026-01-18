import React, { useState } from 'react';
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
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { language, changeLanguage, isRTL, textAlign, flexDirection } = useLanguage();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLanguageChange = async () => {
    // تبديل المسميات: عندما يختار المستخدم "العربية" → نعرض الإنجليزية (RTL)
    // عندما يختار المستخدم "English" → نعرض العربية (LTR)
    const newLanguage = language === 'ar' ? 'en' : 'ar';
    await changeLanguage(newLanguage);
  };
  
  // عرض المسمى المعكوس في الواجهة
  const getDisplayLanguage = () => {
    // عندما language = 'ar' → نعرض "English" (لكن التنسيق RTL)
    // عندما language = 'en' → نعرض "العربية" (لكن التنسيق LTR)
    return language === 'ar' ? 'English' : 'العربية';
  };
  
  const getDisplayLanguageCode = () => {
    return language === 'ar' ? 'EN' : 'عربي';
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('خطأ', 'الرجاء ملء جميع الحقول');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمات المرور غير متطابقة');
      return;
    }

    // Frontend only - no backend implementation
    Alert.alert(
      'قريباً',
      'تغيير كلمة المرور سيكون متاحاً قريباً',
      [{ text: 'حسناً' }]
    );
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
              <MaterialIcons 
                name={isRTL ? "arrow-forward" : "arrow-back"} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { textAlign }]}>الإعدادات</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Language Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>اللغة</Text>
              
              <TouchableOpacity
                style={[styles.languageButton, { flexDirection }]}
                onPress={handleLanguageChange}
                activeOpacity={0.7}
              >
                <View style={[styles.languageLeft, { flexDirection }]}>
                  <MaterialIcons 
                    name="language" 
                    size={22} 
                    color="#D4AF37" 
                    style={styles.languageIcon}
                  />
                  <View style={styles.languageTextContainer}>
                    <Text style={[styles.languageLabel, { textAlign }]}>تغيير اللغة</Text>
                    <Text style={[styles.languageDescription, { textAlign }]}>
                      {getDisplayLanguage()}
                    </Text>
                  </View>
                </View>
                <View style={[styles.languageRight, { flexDirection }]}>
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageBadgeText}>
                      {getDisplayLanguageCode()}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name={isRTL ? "arrow-back" : "arrow-forward"} 
                    size={20} 
                    color="rgba(255,255,255,0.5)" 
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Change Password Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>تغيير كلمة المرور</Text>
              
              {/* Current Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { textAlign }]}>كلمة المرور الحالية</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[styles.passwordInput, { textAlign }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="أدخل كلمة المرور الحالية"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <MaterialIcons
                      name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="rgba(255,255,255,0.6)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { textAlign }]}>كلمة المرور الجديدة</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[styles.passwordInput, { textAlign }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="أدخل كلمة المرور الجديدة"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <MaterialIcons
                      name={showNewPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="rgba(255,255,255,0.6)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { textAlign }]}>تأكيد كلمة المرور</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[styles.passwordInput, { textAlign }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="rgba(255,255,255,0.6)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Change Password Button */}
              <TouchableOpacity
                style={[styles.changePasswordButton, isChangingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
                activeOpacity={0.8}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#1B365D" />
                ) : (
                  <Text style={styles.changePasswordButtonText}>تغيير كلمة المرور</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Coming Soon Notice */}
            <View style={styles.noticeCard}>
              <MaterialIcons name="info-outline" size={24} color="#D4AF37" />
              <Text style={[styles.noticeText, { textAlign }]}>
                هذه الميزة قيد التطوير وسوف تكون متاحة قريباً
              </Text>
            </View>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 60, 67, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  changePasswordButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  changePasswordButtonText: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '700',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    gap: 12,
  },
  noticeText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginTop: 8,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  languageIcon: {
    marginEnd: 0,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  languageDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  languageBadgeText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
  },
});


