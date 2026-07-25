import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ThanksScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Thanks'>;

const TESTIMONIALS = [
  {
    id: 1,
    quote:
      'My lecture recordings used to pile up for weeks. Now, ClinicFact transcribes and summarizes everything before the next class.',
    author: 'Amara Smith, Havard university',
  },
  {
    id: 2,
    quote:
      'I used to copy notes from videos manually. Now, I just paste the link and get highlights ready for revision.',
    author: 'Kenny vaughan, Youtube learner',
  },
  {
    id: 3,
    quote:
      "I'm terrible at remembering key details. ClinicFact's flashcards and Quiz mastery makes it stick easily for rememberance",
    author: 'Clara Johnson, University of california',
  },
  {
    id: 4,
    quote:
      'ClinicFact feels like a study buddy who already understands how I learn best',
    author: 'Barry Rice, Walmart staff',
  },
];

export const ThanksScreen = () => {
  const navigation = useNavigation<ThanksScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{'Thanks for trusting ClinicFact 🎧'}</Text>
        <Text style={styles.subtitle}>
          {"You're joining 5000+ learners who turned their messy notes into clarity and confidence."}
        </Text>

        {/* Testimonial cards */}
        <View style={styles.cardsContainer}>
          {TESTIMONIALS.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.card,
                { borderColor: index % 2 === 0 ? '#FFB09C' : '#C8E6C9' },
              ]}
            >
              <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
              <Text style={styles.quoteText}>{item.quote}</Text>
              <Text style={styles.authorText}>{item.author}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('ReviewStyle')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1C',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#636363',
    lineHeight: 24,
    marginBottom: 28,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
  },
  stars: {
    fontSize: 20,
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
    marginBottom: 10,
  },
  authorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: '#FDFBF0',
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
