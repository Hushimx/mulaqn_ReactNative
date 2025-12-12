import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, API_ENDPOINTS } from '@/utils/api';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  locale?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string, passwordConfirmation: string, otpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sendOtp: (phone: string, purpose: 'login' | 'register' | 'reset_password' | 'verify_phone') => Promise<void>;
  verifyOtp: (phone: string, otpCode: string, purpose: 'login' | 'register' | 'reset_password' | 'verify_phone') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * تحميل token من AsyncStorage عند بدء التطبيق
   */
  useEffect(() => {
    loadToken();
  }, []);

  /**
   * تحميل بيانات المستخدم إذا كان token موجود
   */
  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  /**
   * تحميل token من AsyncStorage
   */
  const loadToken = async () => {
    try {
      const storedToken = await api.getToken();
      if (storedToken) {
        setToken(storedToken);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading token:', error);
      setIsLoading(false);
    }
  };

  /**
   * تسجيل الدخول
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post<{
        ok: boolean;
        data: {
          user: User;
          token: string;
        };
        error: null;
      }>(API_ENDPOINTS.LOGIN, { email, password });

      if (response && response.ok && response.data) {
        const { user: userData, token: userToken } = response.data;
        await api.setToken(userToken);
        setToken(userToken);
        setUser(userData);
      } else {
        throw new Error(response?.error?.message || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * التسجيل (يتطلب OTP code)
   */
  const register = async (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    passwordConfirmation: string,
    otpCode?: string
  ) => {
    try {
      setIsLoading(true);
      const response = await api.post<{
        ok: boolean;
        data: {
          user: User;
          token: string;
        };
        error: null;
      }>(API_ENDPOINTS.REGISTER, {
        full_name: fullName,
        email,
        phone,
        password,
        password_confirmation: passwordConfirmation,
        otp_code: otpCode,
      });

      if (response && response.ok && response.data) {
        const { user: userData, token: userToken } = response.data;
        await api.setToken(userToken);
        setToken(userToken);
        setUser(userData);
      } else {
        throw new Error(response?.error?.message || 'فشل التسجيل');
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * تسجيل الخروج
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      // محاولة تسجيل الخروج من الـ API
      try {
        await api.post(API_ENDPOINTS.LOGOUT);
      } catch (error) {
        // حتى لو فشل الـ API، احذف token محلياً
        console.error('Error logging out from API:', error);
      }
      
      await api.removeToken();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * تحديث بيانات المستخدم
   */
  const refreshUser = async () => {
    try {
      // استخدام silent401 لتجنب رمي خطأ عند 401
      const response = await api.get<{
        ok: boolean;
        data: User;
        error: null;
      }>(API_ENDPOINTS.ME, { silent401: true });

      if (response && response.ok && response.data) {
        setUser(response.data);
      } else {
        // إذا فشل (مثل 401)، احذف token بشكل صامت
        await api.removeToken();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      // هذا لا يجب أن يحدث مع silent401، لكن للاحتياط
      console.error('Error refreshing user:', error);
      await api.removeToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * إرسال OTP
   */
  const sendOtp = async (phone: string, purpose: 'login' | 'register' | 'reset_password' | 'verify_phone') => {
    try {
      setIsLoading(true);
      const response = await api.post<{
        ok: boolean;
        data: {
          message: string;
          expires_at: string;
          otp_code?: string; // في وضع الاختبار
          test_mode?: boolean;
        };
        error: null;
      }>(API_ENDPOINTS.SEND_OTP, { phone, purpose });

      if (response && response.ok && response.data) {
        return;
      } else {
        throw new Error(response?.error?.message || 'فشل إرسال رمز التحقق');
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * التحقق من OTP وتسجيل الدخول
   */
  const verifyOtp = async (phone: string, otpCode: string, purpose: 'login' | 'register' | 'reset_password' | 'verify_phone') => {
    try {
      setIsLoading(true);
      const response = await api.post<{
        ok: boolean;
        data: {
          user?: User;
          token?: string;
          message: string;
          verified?: boolean;
        };
        error: null;
      }>(API_ENDPOINTS.VERIFY_OTP, { phone, otp_code: otpCode, purpose });

      if (response && response.ok && response.data) {
        // إذا كان login، نحفظ token و user
        if (purpose === 'login' && response.data.user && response.data.token) {
          await api.setToken(response.data.token);
          setToken(response.data.token);
          setUser(response.data.user);
        }
        // للـ purposes الأخرى، نرجع فقط نجاح التحقق
        return;
      } else {
        throw new Error(response?.error?.message || 'فشل التحقق من رمز التحقق');
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء التحقق من رمز التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    refreshUser,
    sendOtp,
    verifyOtp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook لاستخدام AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

