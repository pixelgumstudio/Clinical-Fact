import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Linking, StyleSheet } from 'react-native';
import { colors, spacing, typography, RegenerateIcon, Icon, theme } from '@clinicalfact/design-system';
import { MedicalChatImage, MedicalChatSource } from '../../../services/api';
import { RichText } from '../../../components/RichText';
import { Message } from './types';
import { stripCitationMarkers, citationsForBlock } from './citationHelpers';
import { CitationPillsRow } from './CitationPillsRow';

interface ChatMessageBubbleProps {
  item: Message;
  index: number;
  isSendingMessage: boolean;
  onPreviewImage: (image: MedicalChatImage) => void;
  onOpenCitations: (sources: MedicalChatSource[]) => void;
  onRegenerate: (index: number) => void;
  onCopy: (content: string) => void;
  onSelectFollowUp: (question: string) => void;
  onRetryMessage: (index: number) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  item,
  index,
  isSendingMessage,
  onPreviewImage,
  onOpenCitations,
  onRegenerate,
  onCopy,
  onSelectFollowUp,
  onRetryMessage,
}) => {
  const isUser = item.role === 'user';
  const isFailed = item.status === 'failed';

  return (
    <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
      {isUser ? (
        <View style={styles.userMessageColumn}>
          {!!item.attachedImageUri && (
            <TouchableOpacity
              onPress={() => onPreviewImage({
                url: item.attachedImageUri!,
                title: '',
                contextUrl: '',
                attributionRequired: false,
              })}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.attachedImageUri }} style={styles.sentAttachmentThumb} />
            </TouchableOpacity>
          )}
          <View style={styles.userMessage}>
            <Text style={styles.userMessageText}>{item.content}</Text>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.assistantMessage}>
            {/* Static disclosure row — not wired to a real "reasoning" payload;
                tapping it opens the citations sheet when sources exist. Not shown for a failed
                message: "Thinking..." above a Retry button would read as contradictory. */}
            {!isFailed && (
              <TouchableOpacity
                style={styles.thinkingRow}
                onPress={() => item.sources?.length && onOpenCitations(item.sources)}
                activeOpacity={item.sources?.length ? 0.7 : 1}
              >
                <Icon name="ai" size={24} color={theme.colors.grey[400]} />
                <Text style={styles.thinkingText}>Thinking and finding resources for you...</Text>
                <Icon name="foward" size={16} color={theme.colors.grey[400]} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            )}

            {!!item.content && (
              <RichText
                content={item.content}
                transformBlockText={stripCitationMarkers}
                renderBlockFooter={(html, i) => {
                  const blockSources = citationsForBlock(html, item.sources ?? []);
                  if (!blockSources.length) return null;
                  return (
                    <CitationPillsRow
                      key={`${item.id}-block-citations-${i}`}
                      sources={blockSources}
                      onOpenCitations={onOpenCitations}
                      style={styles.blockCitationPillsRow}
                    />
                  );
                }}
              />
            )}

            {isFailed && (
              <View style={styles.failedBlock}>
                <Text style={styles.failedText}>Couldn't generate a response.</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => onRetryMessage(index)}
                  activeOpacity={0.7}
                  disabled={isSendingMessage}
                >
                  <RegenerateIcon size={18} color={theme.colors.white} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!!item.images?.length && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesRow}
              contentContainerStyle={styles.imagesRowContent}
            >
              {item.images.map((image, i) => (
                <TouchableOpacity
                  key={`${item.id}-image-${i}`}
                  onPress={() => onPreviewImage(image)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: image.url }} style={styles.citationImage} resizeMode="cover" />
                  {!!image.attribution && (
                    <Text style={styles.imageAttribution} numberOfLines={1}>{image.attribution}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Per-block pills above already surface most sources in context — this is just a
              compact "see everything" trigger, not another grouped pill row. */}
          {!!item.sources?.length && (
            <TouchableOpacity
              style={styles.allSourcesPill}
              onPress={() => onOpenCitations(item.sources!)}
              activeOpacity={0.7}
            >
              <Text style={styles.allSourcesPillText}>
                {item.sources.length} {item.sources.length === 1 ? 'source' : 'sources'}
              </Text>
            </TouchableOpacity>
          )}

          {!!item.groundingSources?.length && (
            <View style={styles.groundingContainer}>
              <Text style={styles.groundingHeader}>Also referenced from the web</Text>
              {item.groundingSources.map((source, i) => (
                <TouchableOpacity
                  key={`${item.id}-grounding-${i}`}
                  style={styles.groundingCard}
                  onPress={() => Linking.openURL(source.uri)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.groundingTitle} numberOfLines={2}>{source.title}</Text>
                  <Text style={styles.sourceLinkArrow}>↗</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!!item.followUpQuestions?.length && (
            <View style={styles.followUpSection}>
              <Text style={styles.followUpHeader}>Follow up questions</Text>
              <View style={styles.followUpCard}>
                {item.followUpQuestions.map((question, i) => (
                  <TouchableOpacity
                    key={`${item.id}-followup-${i}`}
                    style={[styles.followUpRow, i > 0 && styles.followUpRowDivider]}
                    onPress={() => onSelectFollowUp(question)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.followUpRowText}>{question}</Text>
                    <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {!isFailed && (
            <View style={styles.messageActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onRegenerate(index)}
                activeOpacity={0.7}
                disabled={isSendingMessage}
              >
                <RegenerateIcon size={20} color={theme.colors.grey[700]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onCopy(item.content)}
                activeOpacity={0.7}
              >
                <Icon name="copy" size={20} color={theme.colors.grey[700]} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: spacing[2],
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  userMessageColumn: {
    alignItems: 'flex-end',
    gap: theme.spacing[2],
  },
  sentAttachmentThumb: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.linen[100],
  },
  userMessage: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderTopLeftRadius: theme.borderRadius.lg, // 16
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: theme.spacing[3], // 12
    paddingVertical: theme.spacing[3], // 12
    maxWidth: '80%',
  },
  userMessageText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
  },
  assistantMessage: {
    maxWidth: '100%',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    marginBottom: theme.spacing[4], // 16
  },
  thinkingText: {
    flex: 1,
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[400],
  },
  imagesRow: {
    marginTop: theme.spacing[4], // 16
  },
  imagesRowContent: {
    gap: theme.spacing[4], // 16
  },
  citationImage: {
    width: 170,
    height: 150,
    borderRadius: theme.borderRadius.lg, // 16
    backgroundColor: theme.colors.grey[50],
  },
  imageAttribution: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    maxWidth: 120,
  },
  blockCitationPillsRow: {
    marginTop: theme.spacing[1], // 4 — sits right under its own block, not the whole message
    marginBottom: theme.spacing[2], // 8
  },
  allSourcesPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[3], // 12
    paddingVertical: theme.spacing[2], // 8
    marginTop: theme.spacing[4], // 16
  },
  allSourcesPillText: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 14,
    color: theme.colors.grey[700],
  },
  sourceLinkArrow: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  groundingContainer: {
    marginTop: spacing[3],
    paddingLeft: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing[2],
  },
  groundingHeader: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  groundingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  groundingTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 18,
  },
  failedBlock: {
    marginTop: theme.spacing[2], // 8
    gap: theme.spacing[3], // 12
  },
  failedText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  retryButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    backgroundColor: theme.colors.yale[700],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[2], // 8
  },
  retryButtonText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.white,
  },
  followUpSection: {
    gap: theme.spacing[4], // 16
    marginTop: theme.spacing[4], // 16
  },
  followUpHeader: {
    fontFamily: theme.typography.fontFamily.lora,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.grey[900],
  },
  followUpCard: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.input, // 16
    overflow: 'hidden',
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3], // 12
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
  },
  followUpRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[50], // #EBEBEB
  },
  followUpRowText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.grey[900],
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4], // 16
    marginTop: theme.spacing[3], // 12
  },
  actionButton: {
    padding: theme.spacing[1], // 4
  },
});
