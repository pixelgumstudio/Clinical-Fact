import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  ImageGradientIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import api from '../../services/api';
import { PoweredByFooter } from '../../components/PoweredByFooter';

type UploadImageNavigationProp = NativeStackNavigationProp<MainStackParamList, 'UploadImage'>;

interface UploadedImage {
  uri: string;
  name: string;
  createdAt: string;
  type: string;
}

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

export const UploadImageScreen = () => {
  const navigation = useNavigation<UploadImageNavigationProp>();
  const { withAccess } = useGatedFeature();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
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
        let fileName = asset.fileName || `Image ${uploadedImages.length + 1}`;
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

        const newImage = {
          uri,
          name: fileName,
          createdAt: formatDate(new Date()),
          type: mimeType,
        };
        setUploadedImages([newImage]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadAgain = () => {
    handlePickImage();
  };

  const handleContinue = async () => {
    if (uploadedImages.length === 0) return;

    setIsUploading(true);

    try {
      const image = uploadedImages[0];

      // MIME type was set at pick time (HEIC already converted to image/jpeg)
      const mimeType = image.type.startsWith('image/') ? image.type : `image/${image.type}`;

      console.log('Uploading image:', {
        name: image.name,
        uri: image.uri,
        type: mimeType,
      });

      // Upload image with OCR
      const response = await api.uploadImageWithOCR({
        uri: image.uri,
        name: image.name,
        type: mimeType,
      });

      if (!response.success || !response.data) {
        Alert.alert('Upload Failed', response.message || 'Failed to upload image');
        setIsUploading(false);
        return;
      }

      const { ocrResult } = response.data;

      console.log('OCR Result:', ocrResult);

      if (!ocrResult || !ocrResult.text || ocrResult.text.trim().length === 0) {
        const errorMsg = ocrResult?.error || 'Could not extract any text from the image. Please try a different image with clear text.';
        Alert.alert(
          'No Text Detected',
          errorMsg,
          [{ text: 'OK' }]
        );
        setIsUploading(false);
        return;
      }

      console.log('Navigating with OCR text:', ocrResult.text.substring(0, 100));

      // Navigate to generating note screen with OCR text
      navigation.navigate('GeneratingNote', {
        sourceType: 'image',
        fileName: image.name,
        fileUri: image.uri,
        ocrText: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image');
    } finally {
      setIsUploading(false);
    }
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
          <ImageGradientIcon size={64} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Upload Image</Text>
        <Text style={styles.subtitle}>Create a note from any uploaded image</Text>

        {uploadedImages.length === 0 ? (
          /* Upload Area */
<TouchableOpacity style={styles.uploadArea} onPress={() => withAccess(handlePickImage)} activeOpacity={0.7}>
            <UploadCloudIcon />
            <Text style={styles.uploadTitle}>Drag & drop files or Browse</Text>
            <Text style={styles.uploadSubtitle}>Supported formats: PNG, JPEG, HEIC, WEBP</Text>
          </TouchableOpacity>
        ) : (
          /* Uploaded Images Display */
          <>
            <View style={styles.imagesGrid}>
              {uploadedImages.slice(0, 4).map((image, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.uploadAgainButton} onPress={handleUploadAgain}>
              <Text style={styles.uploadAgainText}>Upload again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <PoweredByFooter />
        <TouchableOpacity
          style={[
            styles.continueButton,
            (uploadedImages.length === 0 || isUploading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={uploadedImages.length === 0 || isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.continueButtonText,
                uploadedImages.length === 0 && styles.continueButtonTextDisabled,
              ]}
            >
              Continue
            </Text>
          )}
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
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  imagePreviewContainer: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadAgainButton: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.neutral[200],
    borderRadius: 20,
  },
  uploadAgainText: {
    fontSize: typography.fontSize.sm,
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
