# Subscription Flow Quick Start

## Navigation Path

```
📱 App Start
  └─> 🔍 Explore Tab (Bottom Navigation)
       └─> 💳 الاشتراكات Card (Quick Actions)
            └─> 📋 Subscription Index (Choose Track)
                 └─> 💎 Track Subscription (Choose Plan)
                      └─> ✨ Start Free Trial
```

## Screen Flow Details

### 1. Explore Tab (`app/(tabs)/explore.tsx`)
**Quick Actions Section:**
- **الاشتراكات** (Subscriptions) - Gold badge with membership icon
- **المسارات التعليمية** (Educational Tracks) - Green badge with school icon

### 2. Subscription Index (`app/subscription/index.tsx`)
**Features:**
- Lists all available tracks (قدرات, تحصيلي, STEP)
- Each track card shows:
  - Track name and description
  - Track-specific colored icon
  - Feature highlights (محتوى تفاعلي, تتبع تقدمك, تقارير مفصلة)
  - "عرض الخطط" button
- Info box about 7-day free trial

**Track Colors:**
- قدرات (Track 1): Green (#10B981) 📚
- تحصيلي (Track 2): Blue (#3B82F6) 🎓
- STEP (Track 3): Purple (#8B5CF6) 🌍

### 3. Track Subscription (`app/subscription/[trackId].tsx`)
**Features:**
- "SUPER" badge with track color
- Title: "اختر خطة الاشتراك المناسبة بعد انتهاء تجربتك المجانية لـ7 أيام"
- Two subscription tiers:

#### Family Plan (الاشتراك العائلي)
- Members: 2-6 أعضاء
- Monthly: SAR 24.99 / شهر
- Yearly: 12 شهراً • SAR299.99

#### Personal Plan (الاشتراك الشخصي) - Most Popular ⭐
- Single user
- Monthly: SAR 19.99 / شهر
- Yearly: 12 شهراً • SAR239.99

**Actions:**
- Select tier (tap to select, shows checkmark)
- "ابدأ أسبوعي المجاني" button (Start Free Trial)
- "عرض كل خطط الاشتراك" link (View All Plans)

**Footer:**
Information about automatic payment after trial period

## How to Test

### 1. Start the App
```bash
cd mulaqn_ReactNative
npm start
# or
npx expo start
```

### 2. Navigate to Subscription
1. Open the app on your device/emulator
2. Tap on the "Explore" tab (second tab from right)
3. Scroll down to "Quick Actions" section
4. Tap on "الاشتراكات" card (gold colored)
5. Select a track (قدرات, تحصيلي, or STEP)
6. View and select subscription plan
7. Tap "ابدأ أسبوعي المجاني"

### 3. Expected Behavior
- ✅ Smooth navigation between screens
- ✅ Track-specific colors apply correctly
- ✅ Selected tier shows checkmark
- ✅ Back button returns to previous screen
- ✅ All text displays in Arabic (RTL)
- ✅ Loading states show while fetching data

## Design Highlights

### Colors
- Uses track-specific colors for theming
- Maintains consistent gradient background
- White subscription cards on dark background
- Subtle transparency effects

### Typography
- All Arabic text
- Right-to-left (RTL) layout
- Clear hierarchy (titles, subtitles, body text)

### Icons
- Material Icons throughout
- Consistent icon sizes
- Color-matched to track themes

### Animations
- Smooth screen transitions
- Touch feedback on all buttons
- Loading states with spinners

## Integration Points

### Current
- ✅ Navigation from Explore tab
- ✅ Track data from API
- ✅ Track-specific theming

### Future (To Be Implemented)
- 🔲 Payment processing
- 🔲 Subscription creation
- 🔲 User subscription status
- 🔲 Subscription management
- 🔲 Free trial activation

## API Endpoints Used

### Existing
- `GET /api/tracks` - Fetch all tracks
- `GET /api/tracks/:id` - Fetch specific track

### Needed for Full Implementation
- `POST /api/subscriptions/start-trial` - Start free trial
- `POST /api/payments/subscribe` - Process subscription payment
- `GET /api/me/subscription` - Get user subscription
- `PUT /api/me/subscription` - Update subscription
- `DELETE /api/me/subscription` - Cancel subscription

## Styling Notes

### Component Structure
```
GradientBackground
└─> SafeAreaView
    ├─> Header (with back button)
    └─> ScrollView
        ├─> Badge (SUPER)
        ├─> Title
        ├─> Tier Cards
        ├─> Description
        ├─> Start Button
        ├─> View All Link
        └─> Footer Note
```

### Responsive Design
- Works on all screen sizes
- ScrollView for vertical overflow
- Flexible card layouts
- Adaptive padding and spacing

## Files Modified/Created

### Created
- ✅ `app/subscription/_layout.tsx`
- ✅ `app/subscription/index.tsx`
- ✅ `app/subscription/[trackId].tsx`
- ✅ `SUBSCRIPTION_IMPLEMENTATION.md`
- ✅ `SUBSCRIPTION_QUICK_START.md`

### Modified
- ✅ `app/(tabs)/explore.tsx` - Added Quick Actions section

### Dependencies Used
- `expo-router` - Navigation
- `@expo/vector-icons` - Icons
- `expo-linear-gradient` - Gradient backgrounds
- `react-i18next` - Internationalization (future use)

## Troubleshooting

### Issue: Screen not showing
**Solution:** Make sure you're navigating from the Explore tab

### Issue: Colors not matching
**Solution:** Check that track ID is being passed correctly in the URL

### Issue: API not loading
**Solution:** Verify backend is running and API base URL is correct

### Issue: Back button not working
**Solution:** Ensure router.back() is called correctly

## Next Development Steps

1. **Implement Payment Flow**
   - Create payment screen
   - Integrate with Paylink
   - Handle success/failure states

2. **Add Subscription Management**
   - Show current subscription status
   - Allow cancellation
   - Allow upgrades/downgrades

3. **Add Backend Support**
   - Create subscription tables
   - Add subscription endpoints
   - Implement subscription middleware

4. **Add Content Gating**
   - Check subscription before showing lessons
   - Show upgrade prompts
   - Free vs Premium content

## Contact

For questions or issues, refer to the main project documentation.

