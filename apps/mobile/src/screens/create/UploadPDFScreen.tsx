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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { Icon, theme } from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { PoweredByFooter } from '../../components/PoweredByFooter';

type UploadPDFNavigationProp = NativeStackNavigationProp<MainStackParamList, 'UploadPDF'>;
type UploadPDFRouteProp = RouteProp<MainStackParamList, 'UploadPDF'>;

interface UploadedFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export const UploadPDFScreen = () => {
  const navigation = useNavigation<UploadPDFNavigationProp>();
  const route = useRoute<UploadPDFRouteProp>();
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
        intent: route.params?.intent,
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
          <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Icon name="notesFill" size={40} color="#FFFFFF" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Upload Pdf</Text>
        <Text style={styles.subtitle}>Create a note from any uploaded pdf</Text>

        {!uploadedFile ? (
          /* Upload Area */
          <TouchableOpacity style={styles.uploadArea} onPress={() => withAccess(handlePickFile)} activeOpacity={0.7}>
            <View style={styles.uploadAreaIcon}>
              <Icon name="note" size={24} color={theme.colors.yale[900]} />
            </View>
            <Text style={styles.uploadTitle}>Drag & drop files or Browse</Text>
            <Text style={styles.uploadSubtitle}>Supported format : pdf</Text>
          </TouchableOpacity>
        ) : (
          /* Uploaded File Display */
          <View style={styles.uploadedFileCard}>
            <View style={styles.fileIcon}>
              <Icon name="note" size={24} color={theme.colors.yale[900]} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {truncateFileName(uploadedFile.name)}
              </Text>
              <Text style={styles.fileDate}>{uploadedFile.createdAt}</Text>
            </View>
            <Icon name="foward" size={16} color={theme.colors.grey[200]} />
          </View>
        )}

        {uploadedFile && (
          <TouchableOpacity style={styles.changeFileButton} onPress={handleChangeFile} activeOpacity={0.7}>
            <Text style={styles.changeFileText}>Change file</Text>
          </TouchableOpacity>
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
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing[8],
  },
  uploadArea: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[6],
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  uploadAreaIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  uploadTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  uploadSubtitle: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  uploadedFileCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[800],
    marginBottom: 2,
  },
  fileDate: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[500],
  },
  changeFileButton: {
    marginTop: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
  },
  changeFileText: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.grey[900],
  },
  footer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  continueButton: {
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
});
