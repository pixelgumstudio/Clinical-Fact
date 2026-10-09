import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Modal, StyleSheet } from 'react-native';
import { theme } from '@clinicalfact/design-system';
import { Icon } from '@clinicalfact/design-system';
import { MedicalChatSource } from '../../../services/api';
import { formatSourceMeta } from './citationHelpers';
import { sheetChromeStyles } from './sheetChromeStyles';

interface ChatCitationsSheetProps {
  sources: MedicalChatSource[] | null;
  onClose: () => void;
}

/** "Check citations" sheet — opened by tapping a citation pill or the "Thinking..."
 *  disclosure row on an assistant message. */
export const ChatCitationsSheet: React.FC<ChatCitationsSheetProps> = ({ sources, onClose }) => (
  <Modal
    visible={!!sources}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={sheetChromeStyles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={sheetChromeStyles.sheet}>
        <View style={sheetChromeStyles.handle} />
        <View style={sheetChromeStyles.header}>
          <TouchableOpacity onPress={onClose} style={sheetChromeStyles.closeButton} activeOpacity={0.7}>
            <Icon name="close" size={20} color={theme.colors.grey[900]} />
          </TouchableOpacity>
          <Text style={sheetChromeStyles.title}>Check citations</Text>
          <View style={sheetChromeStyles.closeButton} />
        </View>
        <ScrollView style={styles.citationsList} showsVerticalScrollIndicator={false}>
          {sources?.map((source) => (
            <TouchableOpacity
              key={source.index}
              style={styles.citationCard}
              onPress={() => source.doi && Linking.openURL(source.doi)}
              activeOpacity={source.doi ? 0.7 : 1}
            >
              <View style={styles.citationCardText}>
                <Text style={styles.citationCardMeta} numberOfLines={1}>
                  {formatSourceMeta(source)}
                </Text>
                <Text style={styles.citationCardTitle} numberOfLines={2}>{source.title}</Text>
              </View>
              <Icon name="foward" size={16} color={theme.colors.grey[300]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  citationsList: {
    width: '100%',
    maxHeight: 420,
  },
  citationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.md, // 12
    padding: theme.spacing[4], // 16
    marginBottom: theme.spacing[3], // 12
  },
  citationCardText: {
    flex: 1,
    gap: theme.spacing[1.5],
  },
  citationCardMeta: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[600],
  },
  citationCardTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
});
