import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export const PoweredByFooter = () => (
  <View style={styles.container}>
    <Text style={styles.label}>Powered by</Text>
    <View style={styles.logoRow}>
      {/* Icon: replace with exported ClinicFactIconSVG when available */}
      <Image
        source={require('../../assets/logo.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      {/* Wordmark: replace with exported ClinicFactWordmarkSVG when available */}
      <Text style={styles.wordmark}>ClinicFact</Text>
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
    color: '#636363',
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
    color: '#1C1C1C',
    letterSpacing: -0.5,
  },
});
