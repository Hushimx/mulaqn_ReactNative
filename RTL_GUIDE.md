# RTL/LTR Support Guide

## Overview

The Mulaqn app fully supports both RTL (Right-to-Left) for Arabic and LTR (Left-to-Right) for English. The direction is automatically determined based on the selected language and is applied globally across all pages.

## How It Works

### Global Configuration

1. **LanguageContext** (`contexts/LanguageContext.tsx`)
   - Manages the current language (Arabic or English)
   - Uses React Native's `I18nManager` to handle RTL/LTR globally
   - Automatically sets RTL for Arabic (`ar`) and LTR for English (`en`)
   - Provides helpful utilities like `isRTL`, `textAlign`, and `flexDirection`

2. **Main Layout** (`app/_layout.tsx`)
   - Wraps the entire app with `LanguageProvider`
   - RTL/LTR is applied globally via `I18nManager`
   - All pages automatically respect the current direction

### Using RTL in Components

#### Option 1: Using the `useLanguage` Hook (Simple)

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

export default function MyComponent() {
  const { isRTL, textAlign, flexDirection } = useLanguage();

  return (
    <View style={{ flexDirection }}>
      <Text style={{ textAlign }}>
        This text is automatically aligned!
      </Text>
    </View>
  );
}
```

#### Option 2: Using the `useRTL` Hook (Advanced)

For more complex RTL styling needs:

```typescript
import { useRTL } from '@/hooks/useRTL';

export default function MyComponent() {
  const rtl = useRTL();

  return (
    <View style={{
      flexDirection: rtl.flexDirection,
      ...rtl.marginStart(16),  // Automatically uses marginLeft or marginRight
      ...rtl.paddingEnd(8),    // Automatically uses paddingLeft or paddingRight
    }}>
      <Text style={{ textAlign: rtl.textAlign }}>
        Hello World
      </Text>
      
      {/* Icons that should flip in RTL (like arrows) */}
      <Icon 
        name="arrow-forward" 
        style={rtl.conditionalTransform(true)} 
      />
    </View>
  );
}
```

### Common Patterns

#### 1. Text Alignment

```typescript
const { textAlign } = useLanguage();

<Text style={{ textAlign }}>
  Your text here
</Text>
```

#### 2. Flex Direction (Horizontal Layouts)

```typescript
const { flexDirection } = useLanguage();

<View style={{ 
  flexDirection,  // 'row' for LTR, 'row-reverse' for RTL
  alignItems: 'center' 
}}>
  <Icon name="star" />
  <Text>Rating</Text>
</View>
```

#### 3. Margins and Padding

Instead of `marginLeft` or `marginRight`, use:

```typescript
const rtl = useRTL();

<View style={{
  ...rtl.marginStart(16),  // Start of the layout
  ...rtl.marginEnd(16),    // End of the layout
}}>
  <Text>Content</Text>
</View>
```

Or use React Native's built-in properties:

```typescript
<View style={{
  marginStart: 16,  // React Native handles RTL automatically
  marginEnd: 16,
}}>
  <Text>Content</Text>
</View>
```

#### 4. Positioning

```typescript
const rtl = useRTL();

<View style={{
  position: 'absolute',
  ...rtl.left(20),  // Automatically becomes 'right' in RTL
}}>
  <Icon name="menu" />
</View>
```

#### 5. Icons That Should Flip

Some icons (like arrows, chevrons) should be flipped in RTL:

```typescript
const rtl = useRTL();

// Will flip horizontally in RTL
<Icon 
  name="arrow-forward" 
  style={rtl.conditionalTransform(true)} 
/>

// Won't flip (for icons that should stay the same)
<Icon 
  name="settings" 
  style={rtl.conditionalTransform(false)} 
/>
```

### Best Practices

1. **Always use `flexDirection` from context** for horizontal layouts
2. **Always use `textAlign` from context** for text elements
3. **Use `marginStart`/`marginEnd`** instead of `marginLeft`/`marginRight`
4. **Use `paddingStart`/`paddingEnd`** instead of `paddingLeft`/`paddingRight`
5. **Flip directional icons** (arrows, chevrons) in RTL
6. **Don't flip non-directional icons** (settings, star, heart, etc.)
7. **Test your UI in both languages** to ensure it looks correct

### React Native RTL Properties

React Native provides built-in RTL support for these properties:

```typescript
{
  marginStart: 16,    // ✅ Use this instead of marginLeft
  marginEnd: 16,      // ✅ Use this instead of marginRight
  paddingStart: 16,   // ✅ Use this instead of paddingLeft
  paddingEnd: 16,     // ✅ Use this instead of paddingRight
  start: 0,           // ✅ Use this instead of left
  end: 0,             // ✅ Use this instead of right
}
```

### Changing Language

Users can change the language through the app settings. When the language changes:

1. The `I18nManager` updates the global direction
2. The app prompts the user to restart (required for RTL to take effect)
3. After restart, all pages automatically use the new direction

```typescript
const { changeLanguage } = useLanguage();

// Change to Arabic (RTL)
await changeLanguage('ar');

// Change to English (LTR)
await changeLanguage('en');
```

### Testing RTL

To test RTL in your component:

1. **Change language in the app**:
   - Go to Profile → Settings → Language
   - Select Arabic
   - Restart the app when prompted

2. **Check your component**:
   - Text should be right-aligned
   - Horizontal layouts should be reversed
   - Icons should flip (if applicable)
   - Margins/padding should be on the correct side

### Common Issues and Solutions

#### Issue: Text is not aligned correctly
**Solution**: Make sure you're using `textAlign` from `useLanguage()`:
```typescript
const { textAlign } = useLanguage();
<Text style={{ textAlign }}>Your text</Text>
```

#### Issue: Horizontal layout is not reversed
**Solution**: Use `flexDirection` from `useLanguage()`:
```typescript
const { flexDirection } = useLanguage();
<View style={{ flexDirection }}>...</View>
```

#### Issue: Icon should flip but doesn't
**Solution**: Apply the transform from `useRTL()`:
```typescript
const rtl = useRTL();
<Icon style={rtl.conditionalTransform(true)} />
```

#### Issue: Margin/padding on wrong side
**Solution**: Use `marginStart`/`marginEnd` instead of `marginLeft`/`marginRight`:
```typescript
<View style={{ marginStart: 16, marginEnd: 8 }}>...</View>
```

## Example Component

Here's a complete example showing best practices:

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRTL } from '@/hooks/useRTL';
import { Icon } from 'your-icon-library';

export default function UserCard() {
  const { textAlign, flexDirection } = useLanguage();
  const rtl = useRTL();

  return (
    <View style={[styles.container, { flexDirection }]}>
      <Icon name="user" style={styles.icon} />
      
      <View style={styles.content}>
        <Text style={[styles.name, { textAlign }]}>
          Ahmed Mohammed
        </Text>
        <Text style={[styles.role, { textAlign }]}>
          Student
        </Text>
      </View>
      
      <Icon 
        name="chevron-forward" 
        style={rtl.conditionalTransform(true)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginEnd: 12,  // Using marginEnd for RTL support
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#666',
  },
});
```

## Summary

✅ **RTL is configured globally** - No need to manually handle direction in each page
✅ **Use `useLanguage()` hook** - Get `isRTL`, `textAlign`, `flexDirection`
✅ **Use `useRTL()` hook** - For advanced RTL styling needs
✅ **Use React Native's RTL properties** - `marginStart`, `marginEnd`, etc.
✅ **Test in both languages** - Ensure your UI works correctly in Arabic and English

