import React, { useState } from 'react';
import { Stack } from 'expo-router';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const router = useRouter();
  const handleSubmit = () => {
    console.log({ email, password });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.container}>
          <View style={styles.headerArea}>
            <Text style={styles.title}>تسجيل الدخول</Text>
          </View>

          <View style={styles.sheet}>
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Email */}
              <View style={styles.fieldBlock}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelText}>تسجيل الدخول</Text>
                  <MaterialIcons name="email" size={18} color="#1d7791" style={styles.labelIcon} />
                </View>

                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={20} color="#1d7791" style={styles.leftIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="@gmail.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldBlock}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelText}>الباسورد</Text>
                  <MaterialIcons name="lock" size={18} color="#1d7791" style={styles.labelIcon} />
                </View>

                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => setIsPasswordHidden(prev => !prev)}
                    style={styles.leftIcon}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={isPasswordHidden ? 'visibility-off' : 'visibility'}
                      size={20}
                      color="#1d7791"
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.textInput}
                    placeholder="ادخل كلمة السر"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={isPasswordHidden}
                    textContentType="password"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              {/* Forgot password */}
              <View style={styles.forgotRow}>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>هل نسيت الباسورد؟</Text>
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>تسجيل الدخول</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerLabel}>أو</Text>
                <View style={styles.divider} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialColumn}>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
                  <FontAwesome5 name="google" size={25} color="#DB4437" style={styles.socialIcon} />
                  <Text style={styles.socialText}>تسجيل الدخول باستخدام جوجل</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
                  <FontAwesome5 name="facebook" size={25} color="#1877F2" style={styles.socialIcon} />
                  <Text style={styles.socialText}>تسجيل الدخول بحساب الفيس بوك</Text>
                </TouchableOpacity>
              </View>

              {/* Sign up link */}
              <View style={styles.signupRow}>
                <TouchableOpacity>
                  <Text style={styles.signupText}>انشاء حساب جديد ؟</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const TEAL_600 = '#1d7791';
const TEAL_700 = '#1d7791';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TEAL_600,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: TEAL_600,
  },
  headerArea: {
    height: '25%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    writingDirection: 'rtl',
  },
  formContent: {
    paddingBottom: 32,
    alignItems: 'stretch',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
    minHeight: 24,
  },
  labelText: {
    color: '#1d7791',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  labelIcon: {
    marginTop: 1,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    minHeight: 48,
  },
  leftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#1d7791',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    color: '#1d7791',
    textAlign: 'right',
    backgroundColor: '#fff',
    textAlignVertical: 'center',
    width: '100%',
  },
  forgotRow: {
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 24,
    width: '100%',
  },
  forgotText: {
    color: TEAL_600,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: TEAL_600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    marginVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerLabel: {
    marginHorizontal: 12,
    color: '#1d7791',
  },
  socialColumn: {
    gap: 12,
    width: '100%',
  },
  socialButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 48,
  },
  socialLogo: {
    width: 18,
    height: 18,
    marginRight: 8,
    resizeMode: 'contain',
  },
  socialIcon: {
    marginRight: 8,
  },
  socialText: {
    color: '#1d7791',
    fontWeight: '600',
  },
  signupRow: {
    marginTop: 28,
    alignItems: 'center',
  },
  signupText: {
    color: TEAL_600,
    fontWeight: '700',
  },
});


