# دليل إعداد نظام المصادقة (Authentication)

تم ربط صفحات LOGIN و REGISTER مع API Laravel بنجاح.

## الملفات المُنشأة

### 1. `utils/api.ts`
- API Service للاتصال بالـ backend
- إدارة Token في AsyncStorage
- معالجة الأخطاء والتحقق من البيانات

### 2. `contexts/AuthContext.tsx`
- Auth Context لإدارة حالة المستخدم
- دوال: `login`, `register`, `logout`, `refreshUser`
- حفظ Token تلقائياً في AsyncStorage

### 3. `app/login.tsx`
- صفحة تسجيل الدخول مرتبطة بالـ API
- التحقق من الحقول قبل الإرسال
- معالجة الأخطاء وعرض الرسائل

### 4. `app/register.tsx`
- صفحة التسجيل مرتبطة بالـ API
- التحقق الشامل من البيانات
- التأكد من تطابق كلمة المرور

### 5. `app/_layout.tsx`
- AuthProvider مضاف
- Guard للصفحات المحمية
- توجيه تلقائي حسب حالة المصادقة

## كيفية الاستخدام

### 1. تحديث API Base URL

افتح `utils/api.ts` وغيّر `API_BASE_URL`:

```typescript
// للـ iOS Simulator أو Android Emulator على نفس الجهاز
const API_BASE_URL = 'http://localhost:8000/api';

// للـ Android Device أو iOS Device على شبكة مختلفة
// استخدم IP جهازك بدلاً من localhost
const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

**للعثور على IP جهازك:**
- Mac/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig`

### 2. استخدام Auth في الصفحات

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyScreen() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Text>يجب تسجيل الدخول</Text>;
  }

  return (
    <View>
      <Text>مرحباً {user?.full_name}</Text>
      <Button onPress={logout} title="تسجيل الخروج" />
    </View>
  );
}
```

### 3. استخدام API Service

```typescript
import { api, API_ENDPOINTS } from '@/utils/api';

// GET request
const tracks = await api.get(API_ENDPOINTS.TRACKS);

// POST request
const attempt = await api.post(API_ENDPOINTS.LESSON_ATTEMPTS, {
  lesson_id: 1
});
```

## Guard System

النظام يحمي الصفحات تلقائياً:

- **غير مسجل دخول** يحاول الوصول لـ `(tabs)` → يتم توجيهه لـ `/login`
- **مسجل دخول** يحاول الوصول لـ `/login` أو `/register` → يتم توجيهه لـ `/(tabs)`

## API Endpoints المستخدمة

- `POST /api/register` - التسجيل
- `POST /api/login` - تسجيل الدخول
- `POST /api/logout` - تسجيل الخروج
- `GET /api/me` - بيانات المستخدم الحالي

## ملاحظات مهمة

1. **Token يتم حفظه تلقائياً** في AsyncStorage عند تسجيل الدخول أو التسجيل
2. **Token يتم إرساله تلقائياً** مع جميع الطلبات المحمية
3. **عند انتهاء Token (401)**، يتم حذفه تلقائياً وتوجيه المستخدم لصفحة تسجيل الدخول
4. **للـ Android**، استخدم IP بدلاً من localhost للاتصال بالـ API

## اختبار النظام

1. تأكد أن Laravel API يعمل على `http://localhost:8000`
2. شغّل التطبيق: `npm start`
3. جرّب تسجيل حساب جديد
4. جرّب تسجيل الدخول
5. تأكد أن الصفحات المحمية تعمل فقط بعد تسجيل الدخول

