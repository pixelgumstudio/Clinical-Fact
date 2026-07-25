import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  Alert,
  Linking,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  spacing,
  typography,
  ChevronRightIcon,
} from "@clinicfact/design-system";
import { useAuthStore } from "../../store/authStore";
import { useNavigation } from "@react-navigation/native";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { showInAppPaywall, getSubscriptionStatus } from "../../services/revenuecat";
import { saveTokens } from "../../services/tokenStorage";
import { LanguageSupportModal } from "../../components/LanguageSupportModal";
import { ReferralModal } from "../../components/ReferralModal";
import { CustomAlertModal } from "../../components/CustomAlertModal";
import { api } from "../../services/api";
import { changeLanguage } from "../../i18n";
import { useTranslation } from "react-i18next";


export const ProfileScreen = () => {
  const { t } = useTranslation();
  const { user, signOut: logout } = useAuthStore();
  const navigation = useNavigation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [studyLanguageModalVisible, setStudyLanguageModalVisible] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
  }>({ visible: false, title: '', message: '', buttonText: 'Got it' });
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);

  const closeAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  const { status: subscriptionStatus, hasAccess, setStatus } = useSubscriptionStore();
  const isActive = subscriptionStatus === "premium" || subscriptionStatus === "trial";
  const isExpired = subscriptionStatus === "cancelled";

  useFocusEffect(
    useCallback(() => {
      getSubscriptionStatus().then((status) => setStatus(status));
    }, [])
  );

  const handleAvatarPress = async () => {
    if (isUploadingAvatar) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: false,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const rawExt = (asset.fileName?.split(".").pop() || asset.uri.split(".").pop() || "").toLowerCase();

    let uri = asset.uri;
    let fileName = asset.fileName || `avatar_${Date.now()}.jpg`;

    if (rawExt === "heic" || rawExt === "heif") {
      const converted = await ImageManipulator.manipulateAsync(
        asset.uri,
        [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      uri = converted.uri;
      fileName = fileName.replace(/\.(heic|heif)$/i, ".jpg");
    }

    // Show the locally-selected image immediately — no network needed
    setLocalAvatarUri(uri);
    setIsUploadingAvatar(true);
    try {
      const response = await api.uploadProfilePicture({ uri, name: fileName, type: "image/jpeg" });
      if (response.success && response.data?.user?.profilePicture) {
        await useAuthStore.getState().updateUser({ profilePicture: response.data.user.profilePicture });
      } else {
        setLocalAvatarUri(null);
        Alert.alert("Upload Failed", response.message || "Could not update profile picture.");
      }
    } catch (err: any) {
      setLocalAvatarUri(null);
      Alert.alert("Error", err.message || "Failed to upload profile picture.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const MANAGE_SUBS_URL =
    Platform.OS === 'ios'
      ? 'itms-apps://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';

  const handlePremiumCardPress = useCallback(async () => {
    if (isActive) {
      Linking.openURL(MANAGE_SUBS_URL);
    } else {
      await showInAppPaywall();
    }
  }, [isActive]);

  const handleUpgradePress = useCallback(async () => {
    await showInAppPaywall();
  }, []);

  const APP_STORE_URL = 'https://apps.apple.com/app/clinicfact/id6746345513';
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pixelgumstudio.clinicfact';

  const handleRateApp = () => {
    Linking.openURL(Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL);
  };

  const handleShareApp = () => {
    const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    Share.share({
      message: `Check out ClinicFact – AI-powered study notes! ${url}`,
    });
  };

  const handleRestorePurchases = useCallback(async () => {
    if (isRestoringPurchases || !user) return;

    try {
      setIsRestoringPurchases(true);

      // Call the restore endpoint with current user's Google info
      const response = await api.restoreUserPremium({
        googleId: user.id || user.email,
        email: user.email,
        name: user.name || '',
      });

      if (response.success && response.data?.tokens) {
        // Save tokens to secure storage and reinitialize auth state
        await saveTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
        await useAuthStore.getState().initialize();

        // Refresh subscription status
        const newStatus = await getSubscriptionStatus();
        setStatus(newStatus);

        Alert.alert(
          t('common.success'),
          response.data.subscription === 'PRO'
            ? 'Premium access restored!'
            : 'Account restored. No active subscription found.'
        );
      } else {
        Alert.alert(
          t('common.error'),
          response.message || 'Failed to restore purchases. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Restore purchases error:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Network error. Please check your connection and try again.'
      );
    } finally {
      setIsRestoringPurchases(false);
    }
  }, [user, isRestoringPurchases]);

  // 'unknown' = new user who has never subscribed

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const getLanguageName = (code: string): string => {
    const languageKey =
      (
        {
          en: "english",
          es: "spanish",
          fr: "french",
          de: "german",
          pt: "portuguese",
          "zh-CN": "chineseSimplified",
          "zh-TW": "chineseTraditional",
          ja: "japanese",
          ko: "korean",
          ar: "arabic",
          hi: "hindi",
          ru: "russian",
          it: "italian",
          pl: "polish",
          nl: "dutch",
          sv: "swedish",
          tr: "turkish",
          vi: "vietnamese",
          th: "thai",
          id: "indonesian",
        } as Record<string, string>
      )[code] || "english";
    return t(`languages.${languageKey}`);
  };

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      setLanguageModalVisible(false);
      await changeLanguage(languageCode);
      const response = await api.updateUserLanguage(languageCode);
      if (response.success && response.data?.user) {
        const updatedUserData = response.data.user;
        await useAuthStore.getState().updateUser({
          preferredLanguage: updatedUserData.preferredLanguage || languageCode,
          name: updatedUserData.name,
          username: updatedUserData.username,
          subscription: updatedUserData.subscription,
          profilePicture: updatedUserData.profilePicture,
        });
        Alert.alert(t("common.success"), t("profile.languageUpdated"));
      } else {
        Alert.alert(
          t("common.error"),
          response.message || t("profile.languageUpdateFailed"),
        );
      }
    } catch (error: any) {
      console.error("Language update error:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("profile.languageUpdateFailed"),
      );
    }
  };

  const handleStudyLanguageSelect = async (languageCode: string) => {
    try {
      setStudyLanguageModalVisible(false);
      const response = await api.updateUserStudyLanguage(languageCode);
      if (response.success && response.data?.user) {
        const updatedUserData = response.data.user;
        await useAuthStore.getState().updateUser({
          preferredLanguage: updatedUserData.preferredLanguage,
          studyLanguage: updatedUserData.studyLanguage,
          name: updatedUserData.name,
          username: updatedUserData.username,
          subscription: updatedUserData.subscription,
          profilePicture: updatedUserData.profilePicture,
        });
        Alert.alert(t("common.success"), `Study language set to ${getLanguageName(languageCode)}`);
      } else {
        Alert.alert(
          t("common.error"),
          response.message || "Failed to update study language",
        );
      }
    } catch (error: any) {
      console.error("Study language update error:", error);
      Alert.alert(
        t("common.error"),
        error.message || "Failed to update study language",
      );
    }
  };

  const handleDeleteAccount = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    try {
      setIsDeleting(true);
      const response = await api.deleteAccount();
      if (response.success) {
        setShowDeleteModal(false);
        Alert.alert(t("common.success"), t("profile.accountDeleted"), [
          {
            text: "OK",
            onPress: async () => {
              await logout();
            },
          },
        ]);
      } else {
        Alert.alert(
          t("common.error"),
          response.message || t("profile.deleteFailed"),
        );
      }
    } catch (error: any) {
      console.error("Delete account error:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("profile.deleteFailed"),
      );
    } finally {
      setIsDeleting(false);
      deletingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={handleAvatarPress}
            activeOpacity={0.8}
            disabled={isUploadingAvatar}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatar}>
              {isUploadingAvatar ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (localAvatarUri || user?.profilePicture) ? (
                <Image
                  key={localAvatarUri || user?.profilePicture}
                  source={{ uri: (localAvatarUri || user?.profilePicture)! }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.avatarCameraIcon}>
              <Text style={styles.avatarCameraText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name || "User"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.joinDate}>
            {t("profile.joined")}{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </Text>
        </View>


        {/* Subscription Card — tappable for both states */}
        {isActive ? (
          <TouchableOpacity onPress={handlePremiumCardPress} activeOpacity={0.85}>
            <ImageBackground
              source={require("../../../assets/premium-card.png")}
              style={[styles.subscriptionCardPremium]}
              imageStyle={styles.subscriptionCardImage}
              resizeMode="contain"
            />
            <Text style={styles.manageSubscriptionHint}>
              {Platform.OS === "ios"
                ? `Tap to manage · iPhone Settings → Apple ID → Subscriptions`
                : `Tap to manage · Play Store → Subscriptions`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View>
            <TouchableOpacity onPress={handleUpgradePress} activeOpacity={0.85}>
              <ImageBackground
                source={require("../../../assets/upgrade-to-premium-card.png")}
                style={styles.subscriptionCard}
                imageStyle={styles.subscriptionCardImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Restore Purchases Button */}
            <TouchableOpacity
              onPress={handleRestorePurchases}
              disabled={isRestoringPurchases}
              activeOpacity={0.7}
              style={styles.restoreButton}
            >
              {isRestoringPurchases ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="👤"
            label={t("profile.accountStatus")}
            value={
              isActive
                ? t("profile.active")
                : isExpired
                  ? t("profile.expired")
                  : t("profile.free")
            }
            onPress={() => {}}
            hideChevron
          />
          <MenuItem
            icon="🔗"
            label="Referral Code"
            onPress={() => setShowReferralModal(true)}
          />
          <MenuItem
            icon="📱"
            label={t("profile.version")}
            value={Constants.expoConfig?.version ?? '—'}
            onPress={() => {}}
            hideChevron
          />
          <MenuItem icon="⭐" label={t("profile.rateApp")} onPress={handleRateApp} />
          <MenuItem
            icon="📤"
            label={t("profile.shareApp")}
            onPress={handleShareApp}
          />
          <MenuItem
            icon="🌐"
            label={t("profile.changeLanguage")}
            value={getLanguageName(user?.preferredLanguage || "en")}
            onPress={() => setLanguageModalVisible(true)}
          />
          <MenuItem
            icon="🎓"
            label="Study Language for AI Content"
            value={user?.studyLanguage ? getLanguageName(user.studyLanguage) : "Default (same as app)"}
            onPress={() => setStudyLanguageModalVisible(true)}
          />
          <MenuItem
            icon="💬"
            label={t("profile.chatWithUs")}
            onPress={() =>
              Linking.openURL("mailto:pixelgumstudioapps@gmail.com")
            }
          />
          <MenuItem
            icon="📄"
            label={t("profile.termsAndConditions")}
            onPress={() => Linking.openURL("https://clinicfact.com/terms")}
          />
          <MenuItem
            icon="🔒"
            label={t("profile.privacyPolicy")}
            onPress={() =>
              Linking.openURL("https://clinicfact.com/privacy-policy")
            }
          />
          <MenuItem
            icon="🚪"
            label={t("profile.signout")}
            onPress={() => setShowLogoutModal(true)}
            hideChevron
          />
          <MenuItem
            icon="🗑️"
            label={t("profile.deleteAccount")}
            onPress={() => setShowDeleteModal(true)}
            textColor={colors.error[600]}
          />
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <LanguageSupportModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
        selectedLanguage={user?.preferredLanguage || "en"}
      />

      {/* Study Language Selection Modal */}
      <LanguageSupportModal
        visible={studyLanguageModalVisible}
        onClose={() => setStudyLanguageModalVisible(false)}
        onSelectLanguage={handleStudyLanguageSelect}
        selectedLanguage={user?.studyLanguage || user?.preferredLanguage || "en"}
      />

      {/* Referral Code Modal */}
      <ReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        referralCode={user?.my_referral_code}
        referralCount={user?.referral_count}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <Modal
          visible={showLogoutModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContainer}>
              <Text style={styles.deleteModalTitle}>
                {t("profile.signout")}
              </Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to sign out of your account?
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteModalCancelButton}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalCancelText}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.logoutConfirmButton}
                  onPress={() => {
                    setShowLogoutModal(false);
                    logout();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {t("profile.signout")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          visible={showDeleteModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContainer}>
              <Text style={styles.deleteModalTitle}>
                {t("profile.deleteAccountTitle")}
              </Text>
              <Text style={styles.deleteModalMessage}>
                {t("profile.deleteAccountMessage")}
              </Text>
              <Text style={styles.deleteModalWarning}>
                {t("profile.deleteAccountWarning")}
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteModalCancelButton}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalCancelText}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteModalConfirmButton,
                    isDeleting && styles.deleteModalConfirmButtonDisabled,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {isDeleting ? t("common.deleting") : t("common.delete")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Referral Copy Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  hideChevron?: boolean;
  textColor?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  value,
  onPress,
  hideChevron,
  textColor,
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuIconContainer}>
      <Text style={styles.menuIcon}>{icon}</Text>
    </View>
    <Text
      style={[styles.menuText, textColor ? { color: textColor } : undefined]}
    >
      {label}
    </Text>
    <View style={styles.menuRight}>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {!hideChevron && <ChevronRightIcon size={20} color="#9CA3AF" />}
    </View>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: spacing[3],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  avatarCameraText: {
    fontSize: 11,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  name: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  email: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  joinDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  subscriptionCard: {
    marginHorizontal: spacing[5],
    marginVertical: spacing[3],
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  subscriptionCardImage: {
    borderRadius: 16,
  },
  subscriptionCardPremium: {
    // borderColor: "#10B981",
    // borderWidth: 1,
    // marginVertical: spacing[3],
    // borderWidth: 1,
    // borderColor: none,
    marginHorizontal: spacing[5],
    height: 80,
    // borderRadius: 16,
    overflow: "hidden",
  },
  subscriptionCardContent: {
    flex: 1,
    padding: spacing[4],
    justifyContent: "center",
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  subscriptionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  subscriptionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  manageSubscriptionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  manageSubscriptionHint: {
    marginHorizontal: spacing[5],
    // marginTop: spacing[1],
    marginBottom: spacing[2],
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: 18,
  },

  menuSection: {
    paddingHorizontal: spacing[5],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE5CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing[3],
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginRight: spacing[2],
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  deleteModalContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing[6],
    width: "100%",
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
    textAlign: "center",
  },
  deleteModalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    textAlign: "center",
    lineHeight: 22,
  },
  deleteModalWarning: {
    fontSize: typography.fontSize.sm,
    color: colors.error[600],
    marginBottom: spacing[6],
    textAlign: "center",
    fontWeight: typography.fontWeight.medium,
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: spacing[3],
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  deleteModalCancelText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  logoutConfirmButton: {
    flex: 1,
    backgroundColor: "#1C1C1C",
    borderRadius: 12,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error[600],
    borderRadius: 12,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  deleteModalConfirmButtonDisabled: {
    backgroundColor: colors.error[300],
  },
  deleteModalConfirmText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  restoreButton: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[6],
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: spacing[3],
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButtonText: {
    color: "#FFFFFF",
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
