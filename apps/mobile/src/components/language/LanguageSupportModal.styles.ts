import { StyleSheet } from 'react-native';
import { theme } from '@clinicalfact/design-system';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.linen[300],
    borderTopStartRadius: theme.borderRadius['2xl'],
    borderTopEndRadius: theme.borderRadius['2xl'],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[8],
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  headerTitle: {
    ...theme.typography.textStyles.title1,
    flex: 1,
    color: theme.colors.grey[900],
  },
  closeButton: {
    padding: theme.spacing[1],
    marginStart: theme.spacing[3],
  },
});
