import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Input,
  SearchBar,
  colors,
  typography,
  spacing,
} from '@clinicalfact/design-system';

export default function DesignSystemDemo() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />

      <Text style={styles.title}>🎨 Design System Demo</Text>
      <Text style={styles.subtitle}>Clinical Fact Components</Text>

      {/* Buttons Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buttons</Text>

        <Button variant="primary" onPress={() => Alert.alert('Primary!')}>
          Primary Button
        </Button>

        <Button variant="secondary" onPress={() => Alert.alert('Secondary!')}>
          Secondary Button
        </Button>

        <Button
          variant="primary"
          size="small"
          onPress={() => Alert.alert('Small!')}
        >
          Small Button
        </Button>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={() => Alert.alert('Large!')}
        >
          Large Full Width Button
        </Button>

        <Button
          variant="primary"
          loading={true}
        >
          Loading...
        </Button>

        <Button
          variant="primary"
          disabled={true}
        >
          Disabled Button
        </Button>
      </View>

      {/* Inputs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inputs</Text>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />

        <Input
          label="Disabled Input"
          value="Can't edit this"
          disabled={true}
        />

        <Input
          label="Input with Error"
          value=""
          error="This field is required"
          placeholder="Required field"
        />

        <Input
          label="Input with Helper Text"
          value=""
          helperText="We'll never share your email"
          placeholder="your@email.com"
        />

        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Write your notes here..."
          multiline
          style={{ minHeight: 100 }}
        />
      </View>

      {/* Theme Tokens Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme Tokens</Text>

        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: colors.primary[500] }]} />
          <Text style={styles.colorLabel}>Primary Color</Text>
        </View>

        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: colors.secondary[500] }]} />
          <Text style={styles.colorLabel}>Secondary Color</Text>
        </View>

        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: colors.success[500] }]} />
          <Text style={styles.colorLabel}>Success Color</Text>
        </View>

        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: colors.error[500] }]} />
          <Text style={styles.colorLabel}>Error Color</Text>
        </View>

        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: colors.warning[500] }]} />
          <Text style={styles.colorLabel}>Warning Color</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ✨ All components from @clinicalfact/design-system
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
    padding: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing[8],
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[8],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: spacing[3],
  },
  colorLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  footer: {
    marginTop: spacing[8],
    marginBottom: spacing[12],
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
