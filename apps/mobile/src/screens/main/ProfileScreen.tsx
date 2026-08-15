import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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
import { Icon, IconName, theme, colors, spacing, typography } from "@clinicalfact/design-system";
import { useAuthStore } from "../../store/authStore";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { showInAppPaywall, getSubscriptionStatus } from "../../services/revenuecat";
import { LanguageSupportModal } from "../../components/LanguageSupportModal";
import { ReferralModal } from "../../components/ReferralModal";
import { CustomAlertModal } from "../../components/CustomAlertModal";
import { api } from "../../services/api";
import { changeLanguage } from "../../i18n";
import { useTranslation } from "react-i18next";


export const ProfileScreen = () => {
  const { t } = useTranslation();
  const { user, signOut: logout } = useAuthStore();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
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

  const closeAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  const { status: subscriptionStatus, setStatus } = useSubscriptionStore();
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

  const APP_STORE_URL = 'https://apps.apple.com/app/clinicalfact';
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.clinicalfact.app';

  const handleRateApp = () => {
    Linking.openURL(Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL);
  };

  const handleShareApp = () => {
    const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    Share.share({
      message: `Check out Clinical Fact – AI-powered study notes! ${url}`,
    });
  };

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
            style={styles.avatarOuter}
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

        {/* Subscription row — tappable for both states */}
        <TouchableOpacity
          style={styles.subscriptionRow}
          onPress={isActive ? handlePremiumCardPress : handleUpgradePress}
          activeOpacity={0.85}
        >
          <View style={styles.subscriptionIcon}>
            <Icon name="star" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.subscriptionTextGroup}>
            <Text style={styles.subscriptionTitle}>
              {isActive ? "Pro subscriber" : isExpired ? "Subscription expired" : "Free subscriber"}
            </Text>
            <Text style={styles.subscriptionSubtitle}>
              {isActive
                ? Platform.OS === "ios"
                  ? "Tap to manage · iPhone Settings → Apple ID → Subscriptions"
                  : "Tap to manage · Play Store → Subscriptions"
                : isExpired
                ? "Tap to renew your subscription"
                : "Tap to upgrade to Pro"}
            </Text>
          </View>
          <Icon name="foward" size={20} color={theme.colors.grey[300]} />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="sucessfulFill"
              iconIsFilled
              label={t("profile.accountStatus")}
              value={
                isActive
                  ? t("profile.active")
                  : isExpired
                    ? t("profile.expired")
                    : t("profile.free")
              }
              onPress={() => {}}
            />
            <MenuItem
              icon="score"
              label={t("profile.version")}
              value={Constants.expoConfig?.version ?? '—'}
              onPress={() => {}}
            />
            <MenuItem
              icon="link"
              label="Referral code"
              onPress={() => setShowReferralModal(true)}
            />
          </View>

          <View style={styles.menuGroup}>
            <MenuItem icon="star" label={t("profile.rateApp")} onPress={handleRateApp} />
            <MenuItem icon="shareApp" label={t("profile.shareApp")} onPress={handleShareApp} />
            <MenuItem
              icon="translate"
              label={t("profile.changeLanguage")}
              value={getLanguageName(user?.preferredLanguage || "en")}
              onPress={() => setLanguageModalVisible(true)}
            />
            <MenuItem
              icon="chat"
              label={t("profile.chatWithUs")}
              onPress={() => Linking.openURL("mailto:pixelgumstudioapps@gmail.com")}
            />
            <MenuItem
              icon="chat"
              label={t("profile.reportBug")}
              onPress={() => Linking.openURL("mailto:pixelgumstudioapps@gmail.com?subject=Bug%20Report")}
            />
            <MenuItem
              icon="note"
              label={t("profile.termsAndConditions")}
              onPress={() => Linking.openURL("https://clinicalfact.com/terms")}
            />
            <MenuItem
              icon="note"
              label={t("profile.privacyPolicy")}
              onPress={() => Linking.openURL("https://clinicalfact.com/privacy-policy")}
            />
          </View>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="logoutFill"
              label={t("profile.signout")}
              onPress={() => setShowLogoutModal(true)}
            />
          </View>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="delete"
              label={t("profile.deleteAccount")}
              onPress={() => setShowDeleteModal(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <LanguageSupportModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
        selectedLanguage={user?.preferredLanguage || "en"}
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
  icon: IconName;
  /** "sucessfulFill" draws its own filled circle — render it larger, without a wrapper bg. */
  iconIsFilled?: boolean;
  label: string;
  value?: string;
  onPress: () => void;
  textColor?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  iconIsFilled,
  label,
  value,
  onPress,
  textColor,
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuIconContainer}>
      <Icon name={icon} size={iconIsFilled ? 32 : 24} color={theme.colors.yale[700]} />
    </View>
    <Text
      style={[styles.menuText, textColor ? { color: textColor } : undefined]}
    >
      {label}
    </Text>
    <View style={styles.menuRight}>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <Icon name="foward" size={16} color={theme.colors.grey[200]} />
    </View>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[6],
  },
  avatarOuter: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.grey[10],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[3],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.yale[700],
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 56,
    height: 56,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  name: {
    ...theme.typography.textStyles.subtitle1,
    fontWeight: '600',
    fontSize: 20,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2],
  },
  email: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing[1],
  },
  joinDate: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[600],
  },
  subscriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
  },
  subscriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[900],
    alignItems: "center",
    justifyContent: "center",
  },
  subscriptionTextGroup: {
    flex: 1,
  },
  subscriptionTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  subscriptionSubtitle: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  menuSection: {
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[6],
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingVertical: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[3],
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  menuValue: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
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
});
