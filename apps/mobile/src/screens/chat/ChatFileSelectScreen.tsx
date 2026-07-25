import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  FolderSelectIcon,
  ChevronRightIcon,
  SearchIcon,
  PlusIcon,
  EmptyFolderLargeIcon,
  CloudUploadIcon,
  PDFDocumentIcon,
  ImageGradientIcon,
  ImageIcon,
  DocumentPreviewSmallIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { AddFolderModal } from '../../components/AddFolderModal';
import { UploadProgressModal } from '../../components/UploadProgressModal';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useAuthStore } from '../../store/authStore';
import { showInAppPaywall } from '../../services/revenuecat';


type ChatFileSelectRouteProp = RouteProp<MainStackParamList, 'ChatFileSelect'>;
type ChatFileSelectNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatFileSelect'>;

interface Folder {
  _id: string;
  name: string;
  itemCount: number;
  color: string;
}

interface FileItem {
  id: string;
  title: string;
  date: string;
  type: 'note' | 'image' | 'document';
}

export const ChatFileSelectScreen = () => {
  const navigation = useNavigation<ChatFileSelectNavigationProp>();
  const route = useRoute<ChatFileSelectRouteProp>();
  const type = route.params?.type || 'note';
  const { withAccess } = useGatedFeature();
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'processing' | 'creating-chat' | 'success' | 'error'>('uploading');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'document'>('image');
  const [uploadError, setUploadError] = useState('');
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);


const checkChatLimit = async () => {
    const chatCount = user?.freeUsage?.chats?.count ?? 0;
    
    // 🚨 Let's see exactly what the app thinks your limits are
    console.log('=== CHAT PRE-FLIGHT CHECK ===');
    console.log('hasAccess (Is Pro?):', hasAccess);
    console.log('chatCount:', chatCount);
    
    if (!hasAccess && chatCount >= 1) {
      console.log('Blocked: Free user reached chat limit. Showing paywall.');
      
      // 🛡️ The Drawer Fix: Give the bottom sheet 600ms to close before sliding up the paywall
      setTimeout(async () => {
        try {
          console.log('Attempting to show Paywall now...');
          await showInAppPaywall();
        } catch (error) {
          console.error('Paywall failed:', error);
        }
      }, 600);
      
      return false; // Tell the caller to STOP
    }
    
    return true; // Tell the caller to PROCEED
  };


  useEffect(() => {
    loadData();
  }, [selectedFolder]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      if (!selectedFolder) {
        // Load folders
        const foldersResponse = await api.getFolders();
        if (foldersResponse.success && foldersResponse.data) {
          setFolders(Array.isArray(foldersResponse.data) ? foldersResponse.data : []);
        }
      }

      // Load files/notes
      // 'note' type means all notes — don't filter by sourceType
      const sourceTypeFilter = type === 'document' ? 'pdf' : type === 'note' ? undefined : type;
      const notesResponse = await api.getNotes({
        folderId: selectedFolder?._id,
        ...(sourceTypeFilter ? { sourceType: sourceTypeFilter } : {}),
      });

      if (notesResponse.success && notesResponse.data) {
        const mappedFiles = notesResponse.data.notes.map((note: any) => ({
          id: note._id,
          title: note.title,
          date: `Created ${new Date(note.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}`,
          type: note.sourceType || 'note',
        }));
        setFiles(mappedFiles);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (selectedFolder) {
      setSelectedFolder(null);
    } else {
      navigation.goBack();
    }
  };

  const handleFolderPress = (folder: Folder) => {
    setSelectedFolder(folder);
  };

  const handleFilePress = async (file: FileItem) => {
    const isAllowed = await checkChatLimit();
    if (!isAllowed) return; // 🛑 Stop if limit reached
    
    withAccess(() =>
      navigation.navigate('ChatConversation', {
        noteId: file.id,
        title: file.title,
        type: type,
        fileName: file.title,
      })
    );
  };

  const handleAddFolder = () => {
    setShowAddFolderModal(true);
  };

  const handleCreateFolder = async (name: string, color: string) => {
    try {
      console.log('Creating folder:', name, color);
      const response = await api.createFolder({ name, color });

      if (response.success && response.data) {
        console.log('✅ Folder created:', response.data);
        Alert.alert('Success', `Folder "${name}" created successfully!`);
        // Reload folders
        loadData();
      } else {
        throw new Error(response.message || 'Failed to create folder');
      }
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      Alert.alert('Error', error.message || 'Failed to create folder');
    }
  };

  const handleUploadDocument = async () => {
    const isAllowed = await checkChatLimit();
    if (!isAllowed) return; // 🛑 Stop if limit reached
    withAccess(_doUploadDocument);
  };

  const _doUploadDocument = async () => {
    try {
      console.log('📄 Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picker cancelled');
        return;
      }

      const file = result.assets[0];
      console.log('Selected document:', file.name);

      // Show upload modal
      setUploadFileName(file.name);
      setUploadType('document');
      setUploadStatus('uploading');
      setUploadModalVisible(true);

      // Upload the file
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name,
      } as any);

      const uploadResponse = await api.uploadPDFWithExtraction(formData);

      if (uploadResponse.success && uploadResponse.data) {
        const fileId = uploadResponse.data.fileId;
        console.log('✅ File uploaded:', fileId);

        // Update status to processing
        setUploadStatus('processing');

        // Small delay to show processing state
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create chat session from the uploaded file
        setUploadStatus('creating-chat');
        const chatResponse = await api.createChatSessionFromDocument(fileId);

        if (chatResponse.success && chatResponse.data) {
          console.log('✅ Chat session created:', chatResponse.data._id);

          // Show success state
          setUploadStatus('success');
          await new Promise(resolve => setTimeout(resolve, 800));

          // Close modal and navigate
          setUploadModalVisible(false);
          navigation.navigate('ChatConversation', {
            chatId: chatResponse.data._id,
            title: file.name,
            type: 'document',
            fileName: file.name,
          });
        } else {
          throw new Error(chatResponse.message || 'Failed to create chat session');
        }
      } else {
        throw new Error(uploadResponse.message || 'Failed to upload document');
      }
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      setUploadStatus('error');
      setUploadError(error.message || 'Failed to upload document');
      // Auto-close error modal after 3 seconds
      setTimeout(() => {
        setUploadModalVisible(false);
      }, 3000);
    }
  };

  const handleUploadImage = async () => {
    const isAllowed = await checkChatLimit();
    if (!isAllowed) return; // 🛑 Stop if limit reached
    
    withAccess(_doUploadImage);
  };

  const _doUploadImage = async () => {
    try {
      console.log('🖼️ Opening image picker...');

      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permission to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        console.log('Image picker cancelled');
        return;
      }

      const image = result.assets[0];
      console.log('Selected image:', image.uri);

      const fileName = image.uri.split('/').pop() || 'image.jpg';

      // Show upload modal
      setUploadFileName(fileName);
      setUploadType('image');
      setUploadStatus('uploading');
      setUploadModalVisible(true);

      // Fix: Pass file object directly, not FormData
      const fileObject = {
        uri: image.uri,
        type: image.mimeType || 'image/jpeg',
        name: fileName,
      };

      const uploadResponse = await api.uploadImageWithOCR(fileObject);

      if (uploadResponse.success && uploadResponse.data) {
        const fileId = uploadResponse.data.fileId;
        console.log('✅ Image uploaded:', fileId);

        // Update status to processing
        setUploadStatus('processing');

        // Small delay to show processing state
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create chat session from the uploaded image
        setUploadStatus('creating-chat');
        const chatResponse = await api.createChatSessionFromDocument(fileId);

        if (chatResponse.success && chatResponse.data) {
          console.log('✅ Chat session created:', chatResponse.data._id);

          // Show success state
          setUploadStatus('success');
          await new Promise(resolve => setTimeout(resolve, 800));

          // Close modal and navigate
          setUploadModalVisible(false);
          navigation.navigate('ChatConversation', {
            chatId: chatResponse.data._id,
            title: fileName,
            type: 'image',
            fileName: fileName,
          });
        } else {
          throw new Error(chatResponse.message || 'Failed to create chat session');
        }
      } else {
        throw new Error(uploadResponse.message || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      setUploadStatus('error');
      setUploadError(error.message || 'Failed to upload image');
      // Auto-close error modal after 3 seconds
      setTimeout(() => {
        setUploadModalVisible(false);
      }, 3000);
    }
  };

  const getTypeTitle = () => {
    switch (type) {
      case 'note':
        return 'Select a note';
      case 'image':
        return 'Select an image';
      case 'document':
        return 'Select a document';
      default:
        return 'Select a file';
    }
  };

  const filteredFolders = selectedFolder ? [] : folders;
  const filteredFiles = files.filter(f =>
    searchQuery ? f.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={styles.folderItem}
      onPress={() => handleFolderPress(item)}
      activeOpacity={0.7}
    >
      <FolderSelectIcon size={24} folderColor={item.color} />
      <View style={styles.folderInfo}>
        <Text style={styles.folderName}>{item.name}</Text>
        <Text style={styles.folderCount}>{item.itemCount} items</Text>
      </View>
      <ChevronRightIcon size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
      case 'document':
        return <DocumentPreviewSmallIcon size={24} color="#F97316" />;
      case 'image':
        return <ImageGradientIcon size={24} />;
      case 'note':
      default:
        return <DocumentPreviewSmallIcon size={24} color="#6B7280" />;
    }
  };

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => handleFilePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.fileIcon}>
        {getFileIcon(item.type)}
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.fileDate}>{item.date}</Text>
      </View>
      <ChevronRightIcon size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <EmptyFolderLargeIcon size={80} />
      <Text style={styles.emptyTitle}>No {selectedFolder ? 'files' : 'notes'} to display</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFolder
          ? 'This folder is empty. Go back to select a different folder.'
          : `You don't have any ${type === 'document' ? 'PDF documents' : type === 'image' ? 'images' : 'notes'} yet.\nCreate some notes first, then come back to chat with them.`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedFolder ? selectedFolder.name : getTypeTitle()}
        </Text>
        {folders.length > 0 && !selectedFolder && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddFolder}>
            <PlusIcon size={14} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add folder</Text>
          </TouchableOpacity>
        )}
        {folders.length === 0 && !selectedFolder && <View style={styles.addButton} />}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.neutral[900]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          {/* Upload Options Section - Only show at root level */}
          {!selectedFolder && (
            <View style={styles.uploadSection}>
              {type === 'document' && (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadDocument}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadIconContainer}>
                    <PDFDocumentIcon size={28} color="#F97316" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>Upload new document</Text>
                    <Text style={styles.uploadSubtitle}>Upload a PDF and start chatting instantly</Text>
                  </View>
                  <ChevronRightIcon size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
              {type === 'image' && (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadImage}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadIconContainer}>
                    <ImageIcon size={28} color="#F97316" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>Upload new image</Text>
                    <Text style={styles.uploadSubtitle}>Upload an image and extract text instantly</Text>
                  </View>
                  <ChevronRightIcon size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>OR SELECT FROM LIBRARY</Text>
            </View>
          )}

          {/* Show folders section if there are any */}
          {!selectedFolder && filteredFolders.length > 0 && (
            <View style={styles.foldersSection}>
              <Text style={styles.sectionTitle}>Folders</Text>
              <FlatList
                data={filteredFolders}
                renderItem={renderFolderItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Show files/notes section */}
          <View style={styles.filesSection}>
            {!selectedFolder && filteredFolders.length > 0 && (
              <Text style={styles.sectionTitle}>All Notes</Text>
            )}
            <FlatList
              data={filteredFiles}
              renderItem={renderFileItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
            />
          </View>
        </>
      )}

      {/* Add Folder Modal */}
      <AddFolderModal
        visible={showAddFolderModal}
        onClose={() => setShowAddFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Upload Progress Modal */}
      <UploadProgressModal
        visible={uploadModalVisible}
        type={uploadType}
        fileName={uploadFileName}
        status={uploadStatus}
        errorMessage={uploadError}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[1],
    marginRight: spacing[2],
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[900],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing[1],
  },
  listContent: {
    flexGrow: 1,
  },
  uploadSection: {
    backgroundColor: colors.background.primary,
    paddingBottom: spacing[2],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.neutral[50],
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[3],
  },
  foldersSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing[2],
  },
  filesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  folderInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  folderName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  folderCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  fileInfo: {
    flex: 1,
  },
  fileTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  fileDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[20],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
