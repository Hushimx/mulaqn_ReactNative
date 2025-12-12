import React from 'react';
import { Text, Platform } from 'react-native';

/**
 * Component to render text with basic Markdown support
 * Supports: **bold**, *italic*, `code`
 */
export const MarkdownText: React.FC<{
  text: string;
  style?: any;
  textAlign?: 'left' | 'right' | 'center';
}> = ({ text, style }) => {
  // Split text by markdown patterns and build React elements
  const parseMarkdown = (input: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    // Find all **bold** patterns first (highest priority)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const boldMatches: Array<{ start: number; end: number; content: string }> = [];
    let match;
    
    boldRegex.lastIndex = 0;
    while ((match = boldRegex.exec(input)) !== null) {
      boldMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
    }

    // Find all `code` patterns
    const codeRegex = /`([^`]+)`/g;
    const codeMatches: Array<{ start: number; end: number; content: string }> = [];
    
    codeRegex.lastIndex = 0;
    while ((match = codeRegex.exec(input)) !== null) {
      // Skip if inside a bold match
      const isInsideBold = boldMatches.some(
        (b) => match!.index > b.start && match!.index < b.end
      );
      if (!isInsideBold) {
        codeMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
        });
      }
    }

    // Find all *italic* patterns (but not **)
    // Use a simple approach: find single * that's not part of **
    const italicMatches: Array<{ start: number; end: number; content: string }> = [];
    let i = 0;
    while (i < input.length) {
      if (input[i] === '*' && input[i + 1] !== '*') {
        const endIndex = input.indexOf('*', i + 1);
        if (endIndex !== -1 && input[endIndex + 1] !== '*') {
          // Check if it's inside bold or code
          const isInsideOther = 
            boldMatches.some((b) => i > b.start && i < b.end) ||
            codeMatches.some((c) => i > c.start && i < c.end);
          if (!isInsideOther) {
            italicMatches.push({
              start: i,
              end: endIndex + 1,
              content: input.substring(i + 1, endIndex),
            });
            i = endIndex + 1;
            continue;
          }
        }
      }
      i++;
    }

    // Combine and sort all matches
    const allMatches = [
      ...boldMatches.map((m) => ({ ...m, type: 'bold' as const })),
      ...codeMatches.map((m) => ({ ...m, type: 'code' as const })),
      ...italicMatches.map((m) => ({ ...m, type: 'italic' as const })),
    ].sort((a, b) => a.start - b.start);

    // Build result
    allMatches.forEach((m) => {
      // Add text before match
      if (m.start > lastIndex) {
        const beforeText = input.substring(lastIndex, m.start);
        if (beforeText) {
          result.push(<Text key={key++}>{beforeText}</Text>);
        }
      }

      // Add formatted text
      if (m.type === 'bold') {
        result.push(
          <Text key={key++} style={{ fontWeight: '700' }}>
            {m.content}
          </Text>
        );
      } else if (m.type === 'code') {
        result.push(
          <Text
            key={key++}
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            {m.content}
          </Text>
        );
      } else {
        result.push(
          <Text key={key++} style={{ fontStyle: 'italic' }}>
            {m.content}
          </Text>
        );
      }

      lastIndex = m.end;
    });

    // Add remaining text
    if (lastIndex < input.length) {
      const remaining = input.substring(lastIndex);
      if (remaining) {
        result.push(<Text key={key++}>{remaining}</Text>);
      }
    }

    return result.length > 0 ? result : [input];
  };

  const parsed = parseMarkdown(text);

  // If no markdown found, return plain text
  if (parsed.length === 1 && typeof parsed[0] === 'string') {
    return <Text style={style}>{text}</Text>;
  }

  return <Text style={style}>{parsed}</Text>;
};

