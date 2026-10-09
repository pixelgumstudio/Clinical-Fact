import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography, ChevronDownIcon, Icon, theme } from '@clinicalfact/design-system';

interface ChatHeaderProps {
  hasAccess: boolean;
  isPinned: boolean;
  isPinning: boolean;
  sessionId: string | null;
  chatTitle: string;
  embeddingStatus: string;
  embeddingProgress: number;
  currentLanguageFlag: string;
  currentLanguageCode: string;
  onOpenChatList: () => void;
  onUpgrade: () => void;
  onTogglePin: () => void;
  onOpenRename: () => void;
  onOpenLanguageModal: () => void;
}

/** Avatar (opens chat list) + Upgrade badge on the left, language selector on the right
 *  (advanced medical-search filters live in the "+" attach sheet instead). Chat title lives
 *  on its own row below, tappable to rename. No back chevron:
 *  this screen is the "Home" tab's root, which has no back semantics (same as
 *  Library/Profile); when reached via a push from elsewhere, the OS back gesture still works. */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  hasAccess,
  isPinned,
  isPinning,
  sessionId,
  chatTitle,
  embeddingStatus,
  embeddingProgress,
  currentLanguageFlag,
  currentLanguageCode,
  onOpenChatList,
  onUpgrade,
  onTogglePin,
  onOpenRename,
  onOpenLanguageModal,
}) => (
  <View style={styles.header}>
    <View style={styles.headerTopRow}>
      <View style={styles.headerLeftGroup}>
        <TouchableOpacity onPress={onOpenChatList} activeOpacity={0.7}>
          <Icon name="logo" size={40} />
        </TouchableOpacity>
        <Text style={styles.headerWordmark}>Clinicalfact</Text>
        <TouchableOpacity
          style={[styles.headerStatusBadge2, hasAccess ? styles.headerProBadge : styles.headerFreeBadge]}
          onPress={() => { if (!hasAccess) onUpgrade(); }}
          activeOpacity={hasAccess ? 1 : 0.85}
          disabled={hasAccess}
        >
          <Text style={[styles.headerStatusBadgeText, hasAccess ? styles.headerProBadgeText : styles.headerFreeBadgeText]}>
            {hasAccess ? 'Pro' : 'Free'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerRightGroup}>
        <TouchableOpacity
          style={styles.languageSelector}
          onPress={onOpenLanguageModal}
          activeOpacity={0.7}
        >
          <Text style={styles.flagIcon}>{currentLanguageFlag}</Text>
          <Text style={styles.languageText}>{currentLanguageCode}</Text>
          <ChevronDownIcon size={14} color={theme.colors.grey[600]} />
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={[styles.headerIconButton, isPinned && styles.headerIconButtonActive]}
          onPress={onTogglePin}
          activeOpacity={0.7}
          disabled={!sessionId || isPinning}
        >
          <Icon name="bookmarks" size={24} color={isPinned ? theme.colors.white : theme.colors.grey[900]} />
        </TouchableOpacity> */}
      </View>
    </View>

    {sessionId && (
      <TouchableOpacity
        style={styles.headerTitleRow}
        onPress={onOpenRename}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle} numberOfLines={1}>
          {chatTitle}
        </Text>
        {embeddingStatus === 'completed' && (
          <View style={styles.headerStatusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.headerSubtitle}>Ready · tap to rename</Text>
          </View>
        )}
        {embeddingStatus === 'processing' && (
          <View style={styles.headerStatusBadge}>
            <ActivityIndicator size="small" color={colors.vivid.warning[500]} style={{ marginRight: 4 }} />
            <Text style={[styles.headerSubtitle, { color: colors.vivid.warning[500] }]}>Processing {embeddingProgress}%</Text>
          </View>
        )}
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.linen[300],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerWordmark: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  headerStatusBadge2: {
    paddingHorizontal: theme.spacing[2], // 8
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  headerProBadge: {
    backgroundColor: theme.colors.green[100],
  },
  headerFreeBadge: {
    backgroundColor: theme.colors.white,
  },
  headerStatusBadgeText: {
    ...theme.typography.textStyles.label1,
  },
  headerProBadgeText: {
    color: theme.colors.green[700],
  },
  headerFreeBadgeText: {
    color: theme.colors.grey[600],
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4], // 16
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[3], // 12
    paddingVertical: theme.spacing[2], // 8
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing[1], // 4
  },
  flagIcon: {
    fontSize: 16,
  },
  languageText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonActive: {
    backgroundColor: theme.colors.grey[900],
  },
  headerTitleRow: {
    marginTop: spacing[2],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  headerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.vivid.success[500],
    marginRight: 4,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.vivid.success[500],
  },
});
