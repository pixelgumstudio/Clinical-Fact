import { StyleSheet } from 'react-native';
import { theme } from '@clinicalfact/design-system';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    height: theme.spacing[12], // 48
    marginHorizontal: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.input, // 16
  },
  searchInput: {
    ...theme.typography.textStyles.p1,
    flex: 1,
    color: theme.colors.grey[900],
    paddingVertical: 0,
  },
  list: {
    flex: 1,
    marginTop: theme.spacing[4],
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    gap: theme.spacing[2],
  },
  defaultRow: {
    marginBottom: theme.spacing[2],
  },
  empty: {
    ...theme.typography.textStyles.p1,
    paddingVertical: theme.spacing[8],
    textAlign: 'center',
    color: theme.colors.grey[300],
  },
});
