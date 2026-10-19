import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Folder } from '../../store/folderStore';
import { useFolders, useAddFolder, useDeleteFolder } from '../../hooks/queries';
import { AddFolderModal } from '../../components/AddFolderModal';
import { colors, spacing, typography, FolderIcon, PlusIcon, DeleteIcon } from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useTranslation } from 'react-i18next';

type FolderScreenNavProp = NativeStackNavigationProp<MainStackParamList>;

interface FolderItemProps {
  item: Folder;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({ item, onDelete, onPress }) => {
  const { t } = useTranslation();
  const folderId = item._id || item.id || '';

  const handleDelete = () => {
    Alert.alert(
      t('main.folder.deleteFolder'),
      t('main.folder.areYouSureYouWantTo', { name: item.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(folderId) },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.folderItem} onPress={() => onPress(folderId)} activeOpacity={0.7}>
      <FolderIcon size={24} color={item.color || colors.primary[500]} />
      <Text style={styles.folderName}>{item.name}</Text>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <DeleteIcon size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const FolderScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FolderScreenNavProp>();
  const { data: folders = [], isLoading, error, refetch } = useFolders('note');
  const addFolderMutation = useAddFolder();
  const deleteFolderMutation = useDeleteFolder();
  const [isModalVisible, setModalVisible] = useState(false);

  const handleFolderPress = (folderId: string) => {
    navigation.navigate('FolderDetail', { folderId });
  };

  const handleCreateFolder = async (name: string, color: string) => {
    await addFolderMutation.mutateAsync({ name, color });
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolderMutation.mutate(id, {
      onError: (err: any) => Alert.alert(t('common.error'), err.message || t('main.folder.failedToDeleteFolder')),
    });
  };

  const renderContent = () => {
    if (isLoading && folders.length === 0) {
      return <ActivityIndicator size="large" color={colors.primary[500]} style={styles.centered} />;
    }

    if (error) {
      return <Text style={[styles.centered, styles.errorText]}>{t('main.folder.error', { message: (error as Error).message })}</Text>;
    }

    if (folders.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('main.folder.noFoldersYetCreateOne')}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={folders}
        keyExtractor={(item) => item._id || item.id || ''}
        renderItem={({ item }) => (
          <FolderItem item={item} onDelete={handleDeleteFolder} onPress={handleFolderPress} />
        )}
        contentContainerStyle={styles.listContainer}
        refreshing={isLoading}
        onRefresh={refetch}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('main.folder.folders')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <PlusIcon size={22} color={colors.background.primary} />
        </TouchableOpacity>
      </View>

      {renderContent()}

      <AddFolderModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onCreateFolder={handleCreateFolder}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    padding: spacing[2],
    borderRadius: 99,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error[500],
  },
  listContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  folderName: {
    flex: 1,
    marginLeft: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  deleteButton: {
    padding: spacing[1],
  },
});
