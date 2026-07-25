import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

// ─── Inline parser ────────────────────────────────────────────────────────────

type InlineNode = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

function parseInline(html: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let bold = false;
  let italic = false;
  let code = false;

  const cleaned = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const parts = cleaned.split(/(<\/?(?:strong|b|em|i|code)[^>]*>)/i);

  for (const part of parts) {
    if (!part) continue;
    if (/^<(strong|b)(\s|>)/i.test(part)) { bold = true; continue; }
    if (/^<\/(strong|b)>/i.test(part)) { bold = false; continue; }
    if (/^<(em|i)(\s|>)/i.test(part)) { italic = true; continue; }
    if (/^<\/(em|i)>/i.test(part)) { italic = false; continue; }
    if (/^<code/i.test(part)) { code = true; continue; }
    if (/^<\/code>/i.test(part)) { code = false; continue; }

    // Strip any unknown residual tags then push text
    const text = part.replace(/<[^>]+>/g, '');
    if (text) nodes.push({ text, bold, italic, code });
  }

  return nodes;
}

// ─── Block parser ─────────────────────────────────────────────────────────────

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; html: string }
  | { kind: 'paragraph'; html: string }
  | { kind: 'listitem'; html: string; bullet: string }
  | { kind: 'divider' };

function parseBlocks(raw: string): Block[] {
  const blocks: Block[] = [];

  // Flatten br pairs to paragraph breaks, single br to newline
  let html = raw
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
    .replace(/<br\s*\/?>/gi, '\n');

  // Unwrap ul/ol — we handle li directly
  html = html
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, '')
    .replace(/<hr\s*\/?>/gi, '[[DIVIDER]]');

  // Tokenise by block-level tags
  const pattern = /(<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|\[\[DIVIDER\]\])/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    // Loose text before this block
    const before = html.slice(lastIndex, match.index).replace(/<[^>]+>/g, '').trim();
    if (before) blocks.push({ kind: 'paragraph', html: before });

    const token = match[1];

    if (token === '[[DIVIDER]]') {
      blocks.push({ kind: 'divider' });
    } else {
      const tagMatch = token.match(/^<(h([1-4])|p|li)/i);
      if (!tagMatch) { lastIndex = pattern.lastIndex; continue; }
      const tag = tagMatch[1].toLowerCase();
      const innerMatch = token.match(/^<[^>]+>([\s\S]*?)<\/[^>]+>$/i);
      const inner = innerMatch ? innerMatch[1].trim() : token.replace(/<[^>]+>/g, '').trim();

      if (tag.startsWith('h')) {
        const level = parseInt(tagMatch[2], 10) as 1 | 2 | 3 | 4;
        blocks.push({ kind: 'heading', level, html: inner });
      } else if (tag === 'p') {
        if (inner) blocks.push({ kind: 'paragraph', html: inner });
      } else if (tag === 'li') {
        blocks.push({ kind: 'listitem', html: inner, bullet: '•' });
      }
    }

    lastIndex = pattern.lastIndex;
  }

  // Trailing loose text
  const tail = html.slice(lastIndex).replace(/<[^>]+>/g, '').trim();
  if (tail) blocks.push({ kind: 'paragraph', html: tail });

  return blocks;
}

// ─── Inline renderer ──────────────────────────────────────────────────────────

function renderInline(html: string): React.ReactNode {
  const nodes = parseInline(html);
  if (nodes.length === 1 && !nodes[0].bold && !nodes[0].italic && !nodes[0].code) {
    return nodes[0].text;
  }
  return (
    <>
      {nodes.map((node, i) => {
        if (node.code) {
          return <Text key={i} style={inlineStyles.code}>{node.text}</Text>;
        }
        if (node.bold && node.italic) {
          return <Text key={i} style={inlineStyles.boldItalic}>{node.text}</Text>;
        }
        if (node.bold) {
          return <Text key={i} style={inlineStyles.bold}>{node.text}</Text>;
        }
        if (node.italic) {
          return <Text key={i} style={inlineStyles.italic}>{node.text}</Text>;
        }
        return <Text key={i}>{node.text}</Text>;
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RichTextProps {
  content: string;
  /** Extra style on the container View */
  containerStyle?: object;
}

export const RichText: React.FC<RichTextProps> = ({ content, containerStyle }) => {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <View style={containerStyle}>
      {blocks.map((block, i) => {
        if (block.kind === 'divider') {
          return <View key={i} style={styles.divider} />;
        }

        if (block.kind === 'heading') {
          const headingStyle = [
            styles.heading,
            block.level === 1 && styles.h1,
            block.level === 2 && styles.h2,
            block.level === 3 && styles.h3,
            block.level === 4 && styles.h4,
            i === 0 && { marginTop: 0 },
          ];
          return (
            <Text key={i} style={headingStyle}>
              {renderInline(block.html) as any}
            </Text>
          );
        }

        if (block.kind === 'listitem') {
          return (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet}>{block.bullet}</Text>
              <Text style={styles.listText}>
                {renderInline(block.html) as any}
              </Text>
            </View>
          );
        }

        // paragraph
        const isLast = i === blocks.length - 1;
        return (
          <Text key={i} style={[styles.paragraph, isLast && { marginBottom: 0 }]}>
            {renderInline(block.html) as any}
          </Text>
        );
      })}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inlineStyles = StyleSheet.create({
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  boldItalic: { fontWeight: '700', fontStyle: 'italic' },
  code: {
    fontFamily: 'Courier',
    fontSize: 13,
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
});

const styles = StyleSheet.create({
  heading: {
    color: '#1C1C1C',
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 20,
    marginBottom: 6,
  },
  h1: { fontSize: 22, lineHeight: 30 },
  h2: { fontSize: 19, lineHeight: 27 },
  h3: { fontSize: 17, lineHeight: 25 },
  h4: { fontSize: 15, lineHeight: 23 },

  paragraph: {
    fontSize: 15,
    fontWeight: '400',
    color: '#374151',
    lineHeight: 24,
    letterSpacing: -0.1,
    marginBottom: 12,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6B7280',
    marginRight: 8,
    width: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#374151',
    lineHeight: 24,
    letterSpacing: -0.1,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
});
