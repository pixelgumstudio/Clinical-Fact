import { StyleSheet } from 'react-native';
import { spacing, theme } from '@clinicalfact/design-system';

/** Shared bottom-sheet chrome (overlay, card, handle, header row, close button, title) —
 *  used by both the "Add to chat" attach sheet and the "Check citations" sheet, which are
 *  the same visual shell around different content. */
export const sheetChromeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius['3xl'], // 32
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[6], // 24
    paddingHorizontal: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 60,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[6], // 24
  },
  title: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
