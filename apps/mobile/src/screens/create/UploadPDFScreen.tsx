import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  PDFDocumentGradientIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { PoweredByFooter } from '../../components/PoweredByFooter';

type UploadPDFNavigationProp = NativeStackNavigationProp<MainStackParamList, 'UploadPDF'>;

interface UploadedFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

// PDF File Icon Component
const PDFFileIcon = () => (
  <View style={pdfIconStyles.container}>
    <Svg width={24} height={28} viewBox="0 0 24 28" fill="none">
      <Path
        d="M14 1H4C2.89543 1 2 1.89543 2 3V25C2 26.1046 2.89543 27 4 27H20C21.1046 27 22 26.1046 22 25V9L14 1Z"
        fill="#F3F4F6"
        stroke="#E5E7EB"
        strokeWidth="1.5"
      />
      <Path d="M14 1V9H22" stroke="#E5E7EB" strokeWidth="1.5" />
      <Rect x="5" y="13" width="14" height="2" rx="1" fill="#9CA3AF" />
      <Rect x="5" y="17" width="10" height="2" rx="1" fill="#9CA3AF" />
      <Rect x="5" y="21" width="12" height="2" rx="1" fill="#9CA3AF" />
    </Svg>
  </View>
);

const pdfIconStyles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Upload Icon Component (cloud with arrow)
const UploadCloudIcon = () => (
  <View style={uploadIconStyles.container}>
    <View style={uploadIconStyles.cloud}>
      <View style={uploadIconStyles.cloudBody} />
      <View style={uploadIconStyles.cloudBump1} />
      <View style={uploadIconStyles.cloudBump2} />
      <View style={uploadIconStyles.cloudBump3} />
    </View>
    <View style={uploadIconStyles.arrow}>
      <View style={uploadIconStyles.arrowLine} />
      <View style={uploadIconStyles.arrowHead} />
    </View>
  </View>
);

const uploadIconStyles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cloud: {
    position: 'relative',
  },
  cloudBody: {
    width: 48,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  cloudBump1: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    top: -8,
    left: 8,
  },
  cloudBump2: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    top: -4,
    left: 24,
  },
  cloudBump3: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    top: -2,
    right: 4,
  },
  arrow: {
    position: 'absolute',
    alignItems: 'center',
  },
  arrowLine: {
    width: 2,
    height: 16,
    backgroundColor: '#9CA3AF',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#9CA3AF',
    marginTop: -2,
  },
});

export const UploadPDFScreen = () => {
  const navigation = useNavigation<UploadPDFNavigationProp>();
  const { withAccess } = useGatedFeature();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `Created ${month} ${day}, ${year}, ${formattedHours}:${formattedMinutes}${ampm}`;
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadedFile({
          name: file.name,
          uri: file.uri,
          size: file.size,
          mimeType: file.mimeType,
          createdAt: formatDate(new Date()),
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleChangeFile = () => {
    handlePickFile();
  };

  const handleContinue = () => {
    if (uploadedFile) {
      navigation.navigate('GeneratingNote', {
        sourceType: 'pdf',
        fileName: uploadedFile.name,
        fileUri: uploadedFile.uri,
      });
    }
  };

  const truncateFileName = (name: string, maxLength: number = 28) => {
    if (name.length <= maxLength) return name;
    const extension = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.') || name.length);
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
    return `${truncatedName}...`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <PDFDocumentGradientIcon size={64} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Upload Pdf</Text>
        <Text style={styles.subtitle}>Create a note from any uploaded pdf</Text>

        {!uploadedFile ? (
          /* Upload Area */
<TouchableOpacity style={styles.uploadArea} onPress={() => withAccess(handlePickFile)} activeOpacity={0.7}>
            <UploadCloudIcon />
            <Text style={styles.uploadTitle}>Drag & drop files or Browse</Text>
            <Text style={styles.uploadSubtitle}>Supported format : pdf, docx</Text>
          </TouchableOpacity>
        ) : (
          /* Uploaded File Display */
          <View style={styles.uploadedFileCard}>
            <PDFFileIcon />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {truncateFileName(uploadedFile.name)}
              </Text>
              <Text style={styles.fileDate}>{uploadedFile.createdAt}</Text>
            </View>
            <TouchableOpacity style={styles.changeFileButton} onPress={handleChangeFile}>
              <Text style={styles.changeFileText}>Change file</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <PoweredByFooter />
        <TouchableOpacity
          style={[styles.continueButton, !uploadedFile && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!uploadedFile}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.continueButtonText, !uploadedFile && styles.continueButtonTextDisabled]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    padding: spacing[1],
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.neutral[300],
    borderRadius: 16,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  uploadTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[1],
  },
  uploadSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  fileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  fileDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  changeFileButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
  },
  changeFileText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
  },
  continueButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  continueButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: colors.neutral[400],
  },
});
