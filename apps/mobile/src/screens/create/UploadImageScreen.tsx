import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Icon, theme } from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import api from '../../services/api';
import { PoweredByFooter } from '../../components/PoweredByFooter';

type UploadImageNavigationProp = NativeStackNavigationProp<MainStackParamList, 'UploadImage'>;
type UploadImageRouteProp = RouteProp<MainStackParamList, 'UploadImage'>;

interface UploadedImage {
  uri: string;
  name: string;
  createdAt: string;
  type: string;
}

export const UploadImageScreen = () => {
  const navigation = useNavigation<UploadImageNavigationProp>();
  const route = useRoute<UploadImageRouteProp>();
  const { withAccess } = useGatedFeature();
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const rawExt = (asset.fileName?.split('.').pop() || asset.uri.split('.').pop() || '').toLowerCase();

        let uri = asset.uri;
        let fileName = asset.fileName || 'Image';
        let mimeType: string = asset.type || 'image';

        // Convert HEIC/HEIF to JPEG since the backend doesn't support HEIC
        if (rawExt === 'heic' || rawExt === 'heif') {
          const converted = await ImageManipulator.manipulateAsync(
            asset.uri,
            [],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = converted.uri;
          fileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
          mimeType = 'image/jpeg';
        }

        setUploadedImage({
          uri,
          name: fileName,
          createdAt: formatDate(new Date()),
          type: mimeType,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleChangeFile = () => {
    handlePickImage();
  };

  const handleContinue = async () => {
    if (!uploadedImage) return;

    setIsUploading(true);

    try {
      // MIME type was set at pick time (HEIC already converted to image/jpeg)
      const mimeType = uploadedImage.type.startsWith('image/') ? uploadedImage.type : `image/${uploadedImage.type}`;

      // Upload image with OCR
      const response = await api.uploadImageWithOCR({
        uri: uploadedImage.uri,
        name: uploadedImage.name,
        type: mimeType,
      });

      if (!response.success || !response.data) {
        Alert.alert('Upload Failed', response.message || 'Failed to upload image');
        setIsUploading(false);
        return;
      }

      const { ocrResult } = response.data;

      if (!ocrResult || !ocrResult.text || ocrResult.text.trim().length === 0) {
        const errorMsg = ocrResult?.error || 'Could not extract any text from the image. Please try a different image with clear text.';
        Alert.alert('No Text Detected', errorMsg, [{ text: 'OK' }]);
        setIsUploading(false);
        return;
      }

      // Navigate to generating note screen with OCR text
      navigation.navigate('GeneratingNote', {
        sourceType: 'image',
        fileName: uploadedImage.name,
        fileUri: uploadedImage.uri,
        ocrText: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
        intent: route.params?.intent,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image');
    } finally {
      setIsUploading(false);
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
          <Icon name="imageFill" size={40} color="#FFFFFF" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Upload image</Text>
        <Text style={styles.subtitle}>Create a note from any uploaded image</Text>

        {!uploadedImage ? (
          /* Upload Area */
          <TouchableOpacity style={styles.uploadArea} onPress={() => withAccess(handlePickImage)} activeOpacity={0.7}>
            <View style={styles.uploadAreaIcon}>
              <Icon name="imageFill" size={24} color={theme.colors.yale[900]} />
            </View>
            <Text style={styles.uploadTitle}>Drag & drop files or Browse</Text>
            <Text style={styles.uploadSubtitle}>Supported format : png, jpeg, heic, webp</Text>
          </TouchableOpacity>
        ) : (
          /* Uploaded Image Display */
          <View style={styles.uploadedFileCard}>
            <View style={styles.fileIcon}>
              <Icon name="imageFill" size={20} color={theme.colors.yale[900]} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {truncateFileName(uploadedImage.name)}
              </Text>
              <Text style={styles.fileDate}>{uploadedImage.createdAt}</Text>
            </View>
            <Icon name="foward" size={16} color={theme.colors.grey[200]} />
          </View>
        )}

        {uploadedImage && (
          <TouchableOpacity style={styles.changeFileButton} onPress={handleChangeFile} activeOpacity={0.7}>
            <Text style={styles.changeFileText}>Change file</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <PoweredByFooter />
        <TouchableOpacity
          style={[styles.continueButton, (!uploadedImage || isUploading) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!uploadedImage || isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
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
