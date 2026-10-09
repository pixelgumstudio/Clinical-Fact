import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '@clinicalfact/design-system';

export const PoweredByFooter = () => (
  <View style={styles.container}>
    <Text style={styles.label}>Powered by</Text>
    <View style={styles.logoRow}>
      {/* Icon: replace with exported Clinical FactIconSVG when available */}
      <Image
        source={require('../../assets/logo.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      {/* Wordmark: replace with exported Clinical FactWordmarkSVG when available */}
      <Text style={styles.wordmark}>Clinical Fact</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: colors.grey[600],
    letterSpacing: -0.28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 47,
    height: 47,
    borderRadius: 12,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.grey[900],
    letterSpacing: -0.5,
  },
});
