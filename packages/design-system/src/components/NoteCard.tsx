/**
 * FILE: /mnt/project/packages/design-system/src/components/NoteCard.tsx
 * 
 * NoteCard Component
 * 
 * A card component for displaying note items in lists.
 * Shows note type, title, date, and actions.
 * 
 * @example
 * ```tsx
 * <NoteCard
 *   note={{
 *     id: '1',
 *     name: 'Biology Lecture',
 *     type: 'audio',
 *     createdAt: new Date(),
 *   }}
 *   onPress={() => navigation.navigate('NoteDetail', { id: '1' })}
 *   onQuiz={() => navigation.navigate('CreateQuiz', { noteId: '1' })}
 * />
 * ```
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { Badge } from './Badge';
import { theme } from '../theme';
import {
  AudioFilePreviewIcon,
  VideoFilePreviewIcon,
  NoteFilePreviewIcon,
  DocumentFileIcon,
  ImageIcon,
  YoutubeIcon,
  MoreVerticalIcon,
} from '../icons';

export interface Note {
  id: string;
  name: string;
  type: 'audio' | 'text' | 'pdf' | 'video' | 'image' | 'youtube';
  createdAt: Date;
  folderId?: string;
  transcription?: string;
}

export interface NoteCardProps {
  /**
   * Note data
   */
  note: Note;

  /**
   * Press handler
   */
  onPress?: () => void;

  /**
   * Quiz action handler
   */
  onQuiz?: () => void;

  /**
   * Flashcard action handler
   */
  onFlashcard?: () => void;

  /**
   * Chat action handler
   */
  onChat?: () => void;

  /**
   * More options handler
   */
  onMore?: () => void;

  /**
   * Show actions
   */
  showActions?: boolean;

  /**
   * Show the content type badge (default: true)
   */
  showTypeBadge?: boolean;

  /**
   * Container style
   */
  style?: ViewStyle;
}

const NOTE_TYPE_CONFIG: Record<Note['type'], { icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  audio: { icon: AudioFilePreviewIcon, color: theme.colors.primary[500] },
  text: { icon: NoteFilePreviewIcon, color: theme.colors.secondary[500] },
  pdf: { icon: DocumentFileIcon, color: theme.colors.error.main },
  video: { icon: VideoFilePreviewIcon, color: theme.colors.info.main },
  image: { icon: ImageIcon, color: theme.colors.success.main },
  youtube: { icon: YoutubeIcon, color: theme.colors.error.main },
};

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPress,
  onMore,
  style,
  showTypeBadge = true,
}) => {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const { icon: NoteIcon, color: iconColor } = NOTE_TYPE_CONFIG[note.type] ?? NOTE_TYPE_CONFIG.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Type Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <NoteIcon size={32} color={iconColor} />
        </View>

        {/* Title and Date */}
        <View style={styles.info}>
          <Text variant="body1" weight="semibold" numberOfLines={1}>
            {note.name}
          </Text>
          <Text variant="caption" color="tertiary" style={styles.date}>
            {formatDate(note.createdAt)}
          </Text>
        </View>

        {/* Type Badge */}
        {showTypeBadge && (
          <Badge
            variant="label"
            color="neutral"
            size="small"
            style={styles.badge}
          >
            {note.type.toUpperCase()}
          </Badge>
        )}

        {/* More Options */}
        {onMore && (
          <TouchableOpacity
            onPress={onMore}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            style={styles.moreButton}
          >
            <MoreVerticalIcon size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Preview Text */}
      {note.transcription && (
        <Text
          variant="body2"
          color="secondary"
          numberOfLines={2}
          style={styles.preview}
        >
          {note.transcription}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },

  info: {
    flex: 1,
  },

  date: {
    marginTop: theme.spacing[1],
  },

  badge: {
    marginLeft: theme.spacing[2],
  },

  moreButton: {
    marginLeft: theme.spacing[1],
    padding: theme.spacing[1],
  },

  preview: {
    marginTop: theme.spacing[3],
    lineHeight: 20,
  },

});

export default NoteCard;