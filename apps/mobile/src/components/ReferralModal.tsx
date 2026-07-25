import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Clipboard,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
} from '@clinicfact/design-system';
import { CustomAlertModal } from './CustomAlertModal';
import api from '../services/api';

interface ReferredFriend {
  name: string;
  joinedAt: string;
}

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
  referralCode: string | undefined;
  referralCount?: number;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  visible,
  onClose,
  referralCode,
  referralCount = 0,
}) => {
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
  }>({ visible: false, title: '', message: '', buttonText: 'Got it' });

  const [friends, setFriends] = useState<ReferredFriend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const closeAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  const fetchFriends = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoadingFriends(true);
    else setIsLoadingMore(true);
    try {
      const response = await api.getReferredFriends(pageNum, 10);
      if (response?.success && response.data) {
        const newFriends = response.data.friends || [];
        setFriends(prev => append ? [...prev, ...newFriends] : newFriends);
        setTotalPages(response.data.pages || 1);
        setPage(pageNum);
      }
    } catch {
      // silently fail — list stays empty
    } finally {
      setIsLoadingFriends(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (visible && referralCount > 0) {
      setFriends([]);
      setPage(1);
      fetchFriends(1, false);
    }
  }, [visible, referralCount, fetchFriends]);

  const handleLoadMore = () => {
    if (!isLoadingMore && page < totalPages) {
      fetchFriends(page + 1, true);
    }
  };

  const handleCopyCode = () => {
    if (referralCode) {
      Clipboard.setString(referralCode);
      setAlertConfig({
        visible: true,
        title: 'Copied!',
        message: 'Your referral code has been copied to clipboard.',
        buttonText: 'Got it',
      });
    }
  };

  const handleShareCode = () => {
    if (referralCode) {
      const appUrl = 'https://play.google.com/store/apps/details?id=com.clinicfact.app';
      Share.share({
        message: `Join me on ClinicFact! Use my code ${referralCode} – ${appUrl}`,
      });
    }
  };

  const formatJoinedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderFriendItem = ({ item }: { item: ReferredFriend }) => (
    <View style={styles.friendRow}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>
          {(item.name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.friendDate}>Joined {formatJoinedDate(item.joinedAt)}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Your Referral Code</Text>
                    <Text style={styles.headerSubtitle}>
                      Share with friends to earn rewards
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <CloseIcon size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Code Display */}
                {referralCode && (
                  <View style={styles.codeContainer}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{referralCode}</Text>
                    </View>
                    <Text style={styles.codeHint}>
                      Your unique referral code to share with friends
                    </Text>
                  </View>
                )}

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyCode}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.copyButtonText}>📋 Copy Code</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShareCode}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.shareButtonText}>📤 Share</Text>
                  </TouchableOpacity>
                </View>

                {/* Referred Friends */}
                <View style={styles.friendsSection}>
                  <View style={styles.friendsHeader}>
                    <Text style={styles.friendsTitle}>
                      {referralCount > 0
                        ? `🎉 You've referred ${referralCount} ${referralCount === 1 ? 'friend' : 'friends'}`
                        : 'Referred Friends'}
                    </Text>
                  </View>

                  {referralCount === 0 ? (
                    <Text style={styles.noFriendsText}>
                      No referrals yet. Share your code to get started!
                    </Text>
                  ) : isLoadingFriends ? (
                    <ActivityIndicator size="small" color="#F97316" style={styles.loadingSpinner} />
                  ) : (
                    <FlatList
                      data={friends}
                      keyExtractor={(_, index) => String(index)}
                      renderItem={renderFriendItem}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={styles.friendSeparator} />}
                      ListFooterComponent={
                        page < totalPages ? (
                          <TouchableOpacity
                            style={styles.loadMoreButton}
                            onPress={handleLoadMore}
                            disabled={isLoadingMore}
                          >
                            {isLoadingMore
                              ? <ActivityIndicator size="small" color="#F97316" />
                              : <Text style={styles.loadMoreText}>Load more</Text>
                            }
                          </TouchableOpacity>
                        ) : null
                      }
                    />
                  )}
                </View>

                {/* How it works */}
                <View style={styles.infoContainer}>
                  <Text style={styles.infoTitle}>How it works</Text>
                  <Text style={styles.infoBullet}>
                    • Friends use your code during signup
                  </Text>
                  <Text style={styles.infoBullet}>
                    • You both earn rewards when they join
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        onClose={closeAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  closeButton: {
    padding: spacing[1],
    marginLeft: spacing[3],
  },
  codeContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  codeBadge: {
    backgroundColor: '#FFF5E1',
    borderWidth: 2,
    borderColor: '#F97316',
    borderRadius: 16,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  codeText: {
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    color: '#F97316',
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  friendsSection: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  friendsHeader: {
    marginBottom: spacing[3],
  },
  friendsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  noFriendsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  loadingSpinner: {
    marginVertical: spacing[4],
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5E1',
    borderWidth: 1,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  friendAvatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: '#F97316',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  friendDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  friendSeparator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 48,
  },
  loadMoreButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: typography.fontSize.sm,
    color: '#F97316',
    fontWeight: typography.fontWeight.medium,
  },
  infoContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginHorizontal: spacing[5],
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  infoBullet: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
    lineHeight: 20,
  },
});
