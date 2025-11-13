import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - يمكن تغييره حسب البيئة
// ملاحظة: للـ Android، استخدم IP الجهاز بدلاً من localhost
// مثال: 'http://192.168.1.100:8000/api'
// للعثور على IP: في Mac/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
// في Windows: ipconfig
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api' // غيّر هذا إلى IP جهازك للـ Android
  : 'https://your-production-domain.com/api';

// Token key في AsyncStorage
const TOKEN_KEY = '@mulaqn_token';

/**
 * API Service للاتصال بالـ backend
 */
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * الحصول على token من AsyncStorage
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * حفظ token في AsyncStorage
   */
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * حذف token من AsyncStorage
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * إرسال request للـ API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // إذا كان الخطأ 401 (Unauthorized)، احذف token
        if (response.status === 401) {
          await this.removeToken();
        }
        
        // معالجة أخطاء التحقق (validation errors)
        if (data.error?.fields && Object.keys(data.error.fields).length > 0) {
          const firstError = Object.values(data.error.fields)[0];
          const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          throw new Error(errorMessage || data.error?.message || 'حدث خطأ في التحقق من البيانات');
        }
        
        throw new Error(data.error?.message || 'حدث خطأ في الاتصال');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ في الاتصال بالخادم');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new ApiService();

// Export baseURL for test endpoints
export const getApiBaseUrl = () => API_BASE_URL;

// Export API endpoints
export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/register',
  LOGIN: '/login',
  LOGOUT: '/logout',
  ME: '/me',
  
  // OTP
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',
  
  // Tracks
  TRACKS: '/tracks',
  TRACK: (id: string | number) => `/tracks/${id}`,
  
  // Lessons
  LESSONS: (trackId: string | number) => `/tracks/${trackId}/lessons`,
  LESSON: (id: string | number) => `/lessons/${id}`,
  
  // Attempts
  LESSON_ATTEMPTS: '/lesson-attempts',
  LESSON_ATTEMPT_RESPONSES: (attemptId: string | number) => `/lesson-attempts/${attemptId}/responses`,
  LESSON_ATTEMPT_SUBMIT: (attemptId: string | number) => `/lesson-attempts/${attemptId}/submit`,
  
  // Gamification
  ACHIEVEMENTS: '/me/achievements',
  BADGES: '/me/badges',
  POINTS: '/me/points',
  LEADERBOARD: '/leaderboard',
  
  // Saved Questions
  SAVED_QUESTIONS: '/saved-questions',
  SAVED_QUESTION: (id: string | number) => `/saved-questions/${id}`,
};

