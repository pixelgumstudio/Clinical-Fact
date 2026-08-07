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
import { Icon, theme } from '@clinicalfact/design-system';
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
      const appUrl = 'https://play.google.com/store/apps/details?id=com.clinicalfact.app';
      Share.share({
        message: `Join me on Clinical Fact! Use my code ${referralCode} – ${appUrl}`,
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
                <View style={styles.dragHandle} />

                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color={theme.colors.grey[900]} />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle} numberOfLines={1}>Referral code</Text>
                  <View style={styles.closeButton} />
                </View>

                <View style={styles.content}>
                  <View style={styles.iconCircle}>
                    <Icon name="link" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.title}>Your Referral Code</Text>
                  <Text style={styles.subtitle}>Share with friends to earn rewards</Text>

                  {/* Code Display */}
                  {referralCode && (
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{referralCode}</Text>
                    </View>
                  )}

                  {/* Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={handleShareCode}
                      activeOpacity={0.7}
                    >
                      <Icon name="shareApp" size={18} color={theme.colors.grey[900]} />
                      <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}
                    >
                      <Icon name="copy" size={18} color="#FFFFFF" />
                      <Text style={styles.copyButtonText}>Copy Code</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Referred Friends */}
                <View style={styles.friendsSection}>
                  <Text style={styles.friendsTitle}>
                    {referralCount > 0
                      ? `You've referred ${referralCount} ${referralCount === 1 ? 'friend' : 'friends'}`
                      : 'Referred friends'}
                  </Text>

                  {referralCount === 0 ? (
                    <Text style={styles.noFriendsText}>
                      No referrals yet. Share your code to get started!
                    </Text>
                  ) : isLoadingFriends ? (
                    <ActivityIndicator size="small" color={theme.colors.yale[700]} style={styles.loadingSpinner} />
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
                              ? <ActivityIndicator size="small" color={theme.colors.yale[700]} />
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
    backgroundColor: 'rgba(2, 22, 39, 0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius['3xl'],
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[8],
    maxHeight: '90%',
  },
  dragHandle: {
    width: 60,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignSelf: 'center',
    marginBottom: theme.spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[3],
  },
  headerTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[6],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing[6],
  },
  codeBadge: {
    width: '100%',
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius['2xl'],
    paddingVertical: theme.spacing[6],
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  codeText: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '600',
    color: theme.colors.yale[700],
    letterSpacing: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    width: '100%',
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.yale[700],
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing[2],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.grey[900],
  },
  friendsSection: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[4],
  },
  friendsTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[3],
  },
  noFriendsText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    lineHeight: 20,
  },
  loadingSpinner: {
    marginVertical: theme.spacing[4],
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  friendAvatarText: {
    ...theme.typography.textStyles.p2,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.grey[900],
  },
  friendDate: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[600],
    marginTop: 2,
  },
  friendSeparator: {
    height: 1,
    backgroundColor: theme.colors.grey[100],
    marginLeft: 48,
  },
  loadMoreButton: {
    paddingVertical: theme.spacing[3],
    alignItems: 'center',
  },
  loadMoreText: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.yale[700],
  },
  infoContainer: {
    backgroundColor: theme.colors.linen[50],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    marginHorizontal: theme.spacing[5],
  },
  infoTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2],
  },
  infoBullet: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing[1],
    lineHeight: 20,
  },
});
