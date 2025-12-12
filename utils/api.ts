import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Base URL - يمكن تغييره حسب البيئة
// ملاحظة: للـ Android والجهاز الحقيقي، استخدم IP الجهاز بدلاً من localhost
// للعثور على IP: في Mac/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
// في Windows: ipconfig
// IP الماك الحالي: 192.168.1.36 (يتم تحديثه تلقائياً)
const buildApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-domain.com/api';
  }
  
  // للـ iOS Simulator: localhost يعمل
  if (Platform.OS === 'ios') {
    // يمكن استخدام localhost للـ Simulator أو IP للجهاز الحقيقي
    // إذا كنت تستخدم Simulator، استخدم 'http://localhost:8000/api'
    // إذا كنت تستخدم جهاز حقيقي، استخدم IP الماك
    return 'http://192.168.1.36:8000/api'; // IP الماك
  }
  
  // للـ Android Emulator: 10.0.2.2 يعمل
  // للـ Android الجهاز الحقيقي: استخدم IP الماك
  return 'http://192.168.1.36:8000/api'; // IP الماك
};

const API_BASE_URL = buildApiBaseUrl();

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
    options: RequestInit & { silent401?: boolean } = {},
    silent401Param?: boolean
  ): Promise<T> {
    const silent401 = silent401Param !== undefined ? silent401Param : options.silent401;
    const { silent401: _, ...fetchOptions } = options;
    const token = await this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      console.log(`[API] ${fetchOptions.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('[API] Non-JSON response:', text);
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      console.log(`[API] Response status: ${response.status}`, data);

      if (!response.ok) {
        // Endpoints العامة - 401 يعني خطأ في البيانات وليس "انتهت صلاحية الجلسة"
        const publicEndpoints = ['/login', '/register', '/auth/send-otp', '/auth/verify-otp'];
        const isPublicEndpoint = publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint));
        
        // إذا كان الخطأ 401 (Unauthorized)
        if (response.status === 401) {
          // للـ endpoints العامة، نرمي الخطأ الأصلي من API
          if (isPublicEndpoint) {
            // معالجة أخطاء التحقق (validation errors)
            if (data.error?.fields && Object.keys(data.error.fields).length > 0) {
              const firstError = Object.values(data.error.fields)[0];
              const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
              throw new Error(errorMessage || data.error?.message || 'حدث خطأ في التحقق من البيانات');
            }
            
            // Handle different error formats
            const errorMessage = data.error?.message || data.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            throw new Error(errorMessage);
          }
          
          // للـ endpoints المحمية، 401 يعني "انتهت صلاحية الجلسة"
          await this.removeToken();
          // إذا كان الطلب صامتاً، لا ترمي خطأ
          if (silent401) {
            return { ok: false, data: null, error: { message: 'Unauthenticated' } } as T;
          }
          throw new Error('انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى');
        }
        
        // معالجة أخطاء التحقق (validation errors)
        if (data.error?.fields && Object.keys(data.error.fields).length > 0) {
          const firstError = Object.values(data.error.fields)[0];
          const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          throw new Error(errorMessage || data.error?.message || 'حدث خطأ في التحقق من البيانات');
        }
        
        // Handle different error formats
        const errorMessage = data.error?.message || data.message || `خطأ ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // إذا كان الطلب صامتاً عند 401، لا تطبع الخطأ
      if (silent401 && error instanceof Error && error.message.includes('انتهت صلاحية الجلسة')) {
        return { ok: false, data: null, error: { message: 'Unauthenticated' } } as T;
      }
      
      console.error('[API] Request failed:', error);
      
      if (error instanceof Error) {
        // Check if it's a network error
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
          throw new Error('فشل الاتصال بالخادم. الرجاء التحقق من الاتصال بالإنترنت');
        }
        throw error;
      }
      throw new Error('حدث خطأ في الاتصال بالخادم');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: { silent401?: boolean }): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, options?.silent401);
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
  LESSON_BOOKMARK: (id: string | number) => `/lessons/${id}/bookmark`,
  LESSON_PIN: (id: string | number) => `/lessons/${id}/pin`,
  LESSON_NOTE: (id: string | number) => `/lessons/${id}/note`,
  
  // Attempts
  LESSON_ATTEMPTS: '/lesson-attempts',
  LESSON_ATTEMPT_RESPONSES: (attemptId: string | number) => `/lesson-attempts/${attemptId}/responses`,
  LESSON_ATTEMPT_SUBMIT: (attemptId: string | number) => `/lesson-attempts/${attemptId}/submit`,
  
  // Gamification
  ACHIEVEMENTS: '/me/achievements',
  BADGES: '/me/badges',
  POINTS: '/me/points',
  LEADERBOARD: '/leaderboard',
  
  // Profile
  PROFILE: '/me/profile',
  PAYMENTS: '/me/payments',
  
  // Tags
  TAGS: '/tags',
  TAG: (id: string | number) => `/tags/${id}`,
  TAGS_REORDER: '/tags/reorder',
  
  // Saved Questions
  SAVED_QUESTIONS: '/saved-questions',
  SAVED_QUESTION: (id: string | number) => `/saved-questions/${id}`,
  SAVE_QUESTION: '/saved-questions',
  UPDATE_SAVED_QUESTION: (id: string | number) => `/saved-questions/${id}`,
  DELETE_SAVED_QUESTION: (id: string | number) => `/saved-questions/${id}`,
  
  // Assessments
  ASSESSMENTS: (trackId: string | number) => `/tracks/${trackId}/assessments`,
  ASSESSMENT: (id: string | number) => `/assessments/${id}`,
  ASSESSMENT_START: '/assessments/start',
  ASSESSMENT_ACTIVE: '/assessments/active/current',
  ASSESSMENT_SAVE_RESPONSE: (attemptId: string | number) => `/assessment-attempts/${attemptId}/responses`,
  ASSESSMENT_SUBMIT: (attemptId: string | number) => `/assessment-attempts/${attemptId}/submit`,
  ASSESSMENT_CANCEL: (attemptId: string | number) => `/assessment-attempts/${attemptId}/cancel`,
  ASSESSMENT_REVIEW: (attemptId: string | number) => `/assessment-attempts/${attemptId}/review`,
  ASSESSMENT_TOGGLE_FLAG: (attemptId: string | number) => `/assessment-attempts/${attemptId}/flag`,

  // Subscriptions
  SUBSCRIPTION_PLANS: (trackId: string | number) => `/tracks/${trackId}/subscription-plans`,
  MY_SUBSCRIPTIONS: '/me/subscriptions',
  CHECK_TRACK_SUBSCRIPTION: (trackId: string | number) => `/me/subscriptions/track/${trackId}`,
  
  // Payments
  CREATE_PAYMENT: (planId: string | number) => `/subscription-plans/${planId}/pay`,
  PAYMENT: (paymentId: string | number) => `/payments/${paymentId}`,
  PAYMENTS: '/me/payments',
  
  // Performance Analysis
  TRACK_PERFORMANCE: (trackId: string | number) => `/tracks/${trackId}/performance-analysis`,
  
  // AI Chat
  AI_CHAT: (trackId: string | number) => `/tracks/${trackId}/ai/chat`,
  AI_CHAT_STREAM: (trackId: string | number) => `/tracks/${trackId}/ai/chat/stream`,
  AI_CHAT_ANSWER: (trackId: string | number) => `/tracks/${trackId}/ai/chat/answer`,
  
  // Multiplayer
  MULTIPLAYER_CREATE: '/multiplayer/sessions/create',
  MULTIPLAYER_JOIN: '/multiplayer/sessions/join',
  MULTIPLAYER_REJOIN: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/rejoin`,
  MULTIPLAYER_STATUS: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/status`,
  MULTIPLAYER_READY: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/ready`,
  MULTIPLAYER_ANSWER: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/answer`,
  MULTIPLAYER_REVEAL: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/reveal`,
  MULTIPLAYER_NEXT: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/next`,
  MULTIPLAYER_RESULTS: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/results`,
  MULTIPLAYER_LEAVE: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/leave`,
  MULTIPLAYER_CHECK_PARTICIPANT: (sessionId: string | number) => `/multiplayer/sessions/${sessionId}/check-participant`,
  
  // Support
  SUPPORT_TICKETS: '/support/tickets',
  SUPPORT_TICKET: (id: string | number) => `/support/tickets/${id}`,
  SUPPORT_TICKET_MESSAGES: (id: string | number) => `/support/tickets/${id}/messages`,
  SUPPORT_TICKET_CLOSE: (id: string | number) => `/support/tickets/${id}/close`,
  SUPPORT_TICKET_REOPEN: (id: string | number) => `/support/tickets/${id}/reopen`,
  SUPPORT_KNOWLEDGE_BASE: '/support/knowledge-base',
  SUPPORT_KNOWLEDGE_BASE_SEARCH: '/support/knowledge-base/search',
  SUPPORT_KNOWLEDGE_BASE_SUGGEST: '/support/knowledge-base/suggest',
  SUPPORT_KNOWLEDGE_BASE_ARTICLE: (id: string | number) => `/support/knowledge-base/${id}`,
  SUPPORT_KNOWLEDGE_BASE_HELPFUL: (id: string | number) => `/support/knowledge-base/${id}/helpful`,
  SUPPORT_KNOWLEDGE_BASE_NOT_HELPFUL: (id: string | number) => `/support/knowledge-base/${id}/not-helpful`,
  SUPPORT_CATEGORIES: '/support/knowledge-base/categories',
  SUPPORT_KNOWLEDGE_BASE_POPULAR: '/support/knowledge-base/popular',
};

