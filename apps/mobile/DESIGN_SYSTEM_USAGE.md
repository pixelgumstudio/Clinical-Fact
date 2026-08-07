# Design System Usage Guide

Your design system is now installed and ready to use! Here's how to use it in your components.

## Installation Complete ✅

The design-system has been:
- ✅ Built successfully
- ✅ Added to mobile app dependencies
- ✅ Installed in the workspace

## Import Components

```typescript
// Import components
import { Button, Input, SearchInput, TextArea } from '@clinicalfact/design-system';

// Import theme tokens
import { colors, typography, spacing } from '@clinicalfact/design-system';
```

## Usage Examples

### Button Component

```typescript
import { Button } from '@clinicalfact/design-system';

// Primary button
<Button variant="primary" onPress={() => console.log('Pressed')}>
  Click Me
</Button>

// Secondary button
<Button variant="secondary" size="large">
  Secondary Button
</Button>

// Loading button
<Button loading={true}>
  Processing...
</Button>

// With icon
<Button
  icon={<Text>📚</Text>}
  iconPosition="left"
>
  With Icon
</Button>
```

### Input Component

```typescript
import { Input } from '@clinicalfact/design-system';

// Basic input
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
/>

// Input with error
<Input
  label="Password"
  error="Password is required"
  secureTextEntry
/>

// Search input
<SearchInput
  value={searchText}
  onChangeText={setSearchText}
  onClear={() => setSearchText('')}
/>

// Text area
<TextArea
  label="Notes"
  placeholder="Enter your notes"
  minHeight={100}
  maxHeight={200}
/>
```

### Theme Tokens

```typescript
import { colors, typography, spacing } from '@clinicalfact/design-system';

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    backgroundColor: colors.surface.default,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
});
```

## Available Components

### Buttons
- `Button` - Main button component with variants (primary, secondary, tertiary, ghost, outline)
- `IconButton` - Circular icon button
- `FAB` - Floating Action Button

### Inputs
- `Input` - Text input with label, error, and helper text
- `SearchInput` - Search input with search icon and clear button
- `TextArea` - Multi-line text input

## Available Theme Tokens

### Colors
- `colors.primary` - Primary brand color
- `colors.secondary` - Secondary brand color
- `colors.error` - Error color
- `colors.success` - Success color
- `colors.warning` - Warning color
- `colors.text.primary` - Primary text color
- `colors.text.secondary` - Secondary text color
- `colors.text.disabled` - Disabled text color
- `colors.text.inverse` - Inverse text color (for dark backgrounds)
- `colors.surface.default` - Default surface color
- `colors.background` - Background color
- `colors.border.default` - Default border color
- `colors.border.focus` - Focus border color
- `colors.border.error` - Error border color
- `colors.neutral[50-900]` - Neutral color scale

### Typography
- `typography.fontSize.xs` - Extra small (12px)
- `typography.fontSize.sm` - Small (14px)
- `typography.fontSize.base` - Base (16px)
- `typography.fontSize.lg` - Large (18px)
- `typography.fontSize.xl` - Extra large (20px)
- `typography.fontSize.2xl` - 2X large (24px)
- `typography.fontSize.3xl` - 3X large (30px)
- `typography.fontWeight.regular` - Regular (400)
- `typography.fontWeight.medium` - Medium (500)
- `typography.fontWeight.semibold` - Semibold (600)
- `typography.fontWeight.bold` - Bold (700)

### Spacing
- `spacing[1]` - 4px
- `spacing[2]` - 8px
- `spacing[3]` - 12px
- `spacing[4]` - 16px
- `spacing[5]` - 20px
- `spacing[6]` - 24px
- `spacing[8]` - 32px
- `spacing[10]` - 40px
- `spacing[12]` - 48px
- `spacing[16]` - 64px

### Border Radius
- `borderRadius.button` - Button border radius
- `borderRadius.input` - Input border radius
- `borderRadius.card` - Card border radius

## Example Screen

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Button,
  Input,
  SearchInput,
  colors,
  typography,
  spacing
} from '@clinicalfact/design-system';

export const ExampleScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Design System Demo</Text>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        placeholder="Search..."
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Enter your password"
      />

      <Button
        variant="primary"
        fullWidth
        onPress={() => console.log('Login')}
      >
        Login
      </Button>

      <Button
        variant="ghost"
        onPress={() => console.log('Forgot password')}
      >
        Forgot Password?
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[6],
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[6],
  },
});
```

## Building the Design System

When you make changes to the design-system:

```bash
# Build the design-system
cd packages/design-system
npm run build

# Or build all packages from root
npm run build
```

## Next Steps

1. Use the components in your screens
2. Customize theme tokens in `packages/design-system/src/theme/`
3. Add more components as needed
4. Keep design consistent across the app!

Happy coding! 🎨
