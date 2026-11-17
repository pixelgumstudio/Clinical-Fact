import { StyleSheet } from 'react-native';
import { theme } from '@clinicalfact/design-system';

// Row: 12pt radius, 12/16 padding, 24pt flag, 24pt check circle -> 48pt tall (see the reference screen).
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', // mirrors by itself in right-to-left languages
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  rowSelected: {
    backgroundColor: theme.colors.grey[10],
  },
  flag: {
    width: theme.spacing[6],
    textAlign: 'center',
    ...theme.typography.textStyles.p1,
    lineHeight: theme.spacing[6],
  },
  name: {
    ...theme.typography.textStyles.p1,
    flexShrink: 1,
    color: theme.colors.grey[900],
  },
  native: {
    ...theme.typography.textStyles.p2,
    flex: 1,
    color: theme.colors.grey[300],
  },
  spacer: {
    flex: 1,
  },
  checkCircle: {
    width: theme.spacing[6],
    height: theme.spacing[6],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPlaceholder: {
    width: theme.spacing[6],
    height: theme.spacing[6],
  },
});
