import { StyleSheet } from 'react-native';
import { theme } from '@clinicalfact/design-system';

// Layout from the reference screen (393pt frame): empty 44pt back-button spacer with a 16pt
// margin (nothing to go back to, but spacing matches the other auth screens) -> title and
// subtitle 16pt apart -> search -> list -> Continue pinned to the bottom (16pt sides, 24pt below).
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  keyboardView: {
    flex: 1,
  },
  backSpacer: {
    height: theme.spacing[11], // 44
    marginTop: theme.spacing[4], // 16
    marginHorizontal: theme.spacing[4],
  },
  titleBlock: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[4], // 16 between title and subtitle
  },
  title: {
    ...theme.typography.textStyles.h5, // 24/32 medium
    color: theme.colors.grey[900],
    textAlign: 'auto',
  },
  subtitle: {
    ...theme.typography.textStyles.p1, // 16/24
    color: theme.colors.grey[900],
    textAlign: 'auto',
  },
  footer: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[6], // 24
  },
});
