import React, { useState, useEffect, useRef } from 'react';
import { Text, Platform, View, StyleSheet } from 'react-native';
import { parseMessage, MessageBlock } from './MessageParser';
import { MathRenderer } from './MathRenderer';

/**
 * MarkdownText - Component to render text with Markdown and LaTeX math
 * 
 * Rules:
 * - LaTeX is Source of Truth (only \(...\) and \[...\])
 * - No Unicode conversion as primary path (only fallback)
 * - No rendering during streaming (show placeholder)
 * - Render math after end-of-stream
 * 
 * Supports:
 * - **bold**, *italic*, `code` (Markdown)
 * - LaTeX math: \(...\) (inline) and \[...\] (block)
 */
export const MarkdownText: React.FC<{
  text: string;
  style?: any;
  textAlign?: 'left' | 'right' | 'center';
  color?: string;
  isStreaming?: boolean; // Explicit streaming flag from parent
}> = ({ text, style, textAlign = 'right', color = '#FFFFFF', isStreaming: externalIsStreaming }) => {
  // Determine RTL from textAlign
  const isRTL = textAlign === 'right';
  const RLM = '\u200F'; // Right-to-Left Mark
  const prevLengthRef = useRef(0);
  const [internalIsStreaming, setInternalIsStreaming] = useState(false);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use external streaming flag if provided, otherwise detect internally
  const isStreaming = externalIsStreaming !== undefined ? externalIsStreaming : internalIsStreaming;
  
  // Internal streaming detection (fallback if external flag not provided)
  useEffect(() => {
    if (externalIsStreaming !== undefined) {
      // External flag provided, skip internal detection
      return;
    }
    
    const currentLength = text.length;
    const prevLength = prevLengthRef.current;
    
    if (currentLength > prevLength) {
      setInternalIsStreaming(true);
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      
      streamingTimeoutRef.current = setTimeout(() => {
        if (text.length === prevLengthRef.current) {
          setInternalIsStreaming(false);
        }
      }, 2000);
    } else if (currentLength === prevLength && currentLength > 0 && internalIsStreaming) {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      streamingTimeoutRef.current = setTimeout(() => {
        if (text.length === prevLengthRef.current) {
          setInternalIsStreaming(false);
        }
      }, 2000);
    }
    
    prevLengthRef.current = currentLength;
    
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [text, internalIsStreaming, externalIsStreaming]);
  
  // Parse message into blocks
  const blocks = React.useMemo(() => {
    return parseMessage(text);
  }, [text]);
  
  // Parse Markdown for text blocks
  const parseMarkdown = (input: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    // Find all **bold** patterns
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
    const italicMatches: Array<{ start: number; end: number; content: string }> = [];
    let i = 0;
    while (i < input.length) {
      if (input[i] === '*' && input[i + 1] !== '*') {
        const endIndex = input.indexOf('*', i + 1);
        if (endIndex !== -1 && input[endIndex + 1] !== '*') {
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
      if (m.start > lastIndex) {
        const beforeText = input.substring(lastIndex, m.start);
        if (beforeText) {
          result.push(
            <Text key={key++} style={{ 
              textAlign,
              writingDirection: 'rtl',
            }}>
              {beforeText}
            </Text>
          );
        }
      }

      if (m.type === 'bold') {
        result.push(
          <Text key={key++} style={{ 
            fontWeight: '700',
            textAlign,
            writingDirection: 'rtl',
          }}>
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
              textAlign,
              writingDirection: 'rtl',
            }}
          >
            {m.content}
          </Text>
        );
      } else {
        result.push(
          <Text key={key++} style={{ 
            fontStyle: 'italic',
            textAlign,
            writingDirection: 'rtl',
          }}>
            {m.content}
          </Text>
        );
      }

      lastIndex = m.end;
    });

    if (lastIndex < input.length) {
      const remaining = input.substring(lastIndex);
      if (remaining) {
        result.push(
          <Text key={key++} style={{ 
            textAlign,
            writingDirection: 'rtl',
          }}>
            {remaining}
          </Text>
        );
      }
    }

    return result.length > 0 ? result : [input];
  };

  // Render blocks
  const renderBlocks = (): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let key = 0;
    let currentTextGroup: React.ReactNode[] = [];
    let currentTextKey = 0;
    
    // Helper: Sanitize text content - remove RTL marks and check if it's only punctuation
    const sanitizeTextBlock = (content: string): string | null => {
      // Remove RTL marks: [\u200E\u200F\u202A-\u202E\u2066-\u2069]
      let sanitized = content.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
      // Trim whitespace
      sanitized = sanitized.trim();
      // Check if it's only punctuation or empty
      if (sanitized === '' || sanitized === '.' || sanitized === '•' || sanitized === '·' || 
          sanitized === '-' || sanitized === '–' || sanitized === '—') {
        return null; // Should be ignored
      }
      return sanitized;
    };
    
    // Helper: Check if block math is standalone (no adjacent real text blocks)
    const isBlockMathStandalone = (index: number): boolean => {
      if (blocks.length === 1) return true; // Only one block
      const currentBlock = blocks[index];
      if (currentBlock.type !== 'math' || currentBlock.display !== 'block') return false;
      
      // Check if there's real text before (after sanitize)
      const hasTextBefore = index > 0 && blocks[index - 1].type === 'text' && 
        sanitizeTextBlock(blocks[index - 1].content) !== null;
      
      // Check if there's real text after (after sanitize)
      const hasTextAfter = index < blocks.length - 1 && blocks[index + 1].type === 'text' && 
        sanitizeTextBlock(blocks[index + 1].content) !== null;
      
      return !hasTextBefore && !hasTextAfter;
    };

    blocks.forEach((block, index) => {
      if (block.type === 'text') {
        // Sanitize and filter out text blocks that are only punctuation or whitespace
        const sanitized = sanitizeTextBlock(block.content);
        if (sanitized === null) {
          // Skip this block
          return;
        }
        
        // Text block - parse markdown (use original content for parsing)
        const parsed = parseMarkdown(block.content);
        const textStyle = [
          style, 
          { 
            writingDirection: 'rtl', 
            textAlign: textAlign, 
            flexShrink: 1, 
            minWidth: 0 
          }
        ];
        
        if (parsed.length === 1 && typeof parsed[0] === 'string') {
          currentTextGroup.push(
            <Text key={currentTextKey++} style={textStyle}>
              {sanitized}
            </Text>
          );
        } else {
          currentTextGroup.push(
            <Text key={currentTextKey++} style={textStyle}>
              {parsed}
            </Text>
          );
        }
      } else if (block.type === 'math') {
        // Math block
        // Check display type explicitly
        const isBlockDisplay = block.display === 'block';
        
        if (isBlockDisplay) {
          // Block math - flush current text group and render separately
          if (currentTextGroup.length > 0) {
            result.push(
              <View key={key++} style={[
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  width: '100%',
                  minWidth: 0,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                }
              ]}>
                {currentTextGroup}
              </View>
            );
            currentTextGroup = [];
            currentTextKey = 0;
          }
          
          if (isStreaming) {
            result.push(
              <View key={key++} style={styles.mathPlaceholder}>
                <Text style={[styles.placeholderText, { color }]}>
                  ⏳ جارٍ تجهيز المعادلة...
                </Text>
              </View>
            );
          } else {
            // Check if block math is standalone (no adjacent real text blocks)
            const isStandalone = isBlockMathStandalone(index);
            
            if (isStandalone) {
              // Wrap standalone block math in centered container
              result.push(
                <View key={key++} style={styles.standaloneMathContainer}>
                  <MathRenderer
                    latex={block.latex || block.content}
                    display="block"
                    color={color}
                    style={[styles.blockMath, { width: 'auto', maxWidth: '100%' }]}
                  />
                </View>
              );
            } else {
              // Non-standalone block math (has text around it)
              result.push(
                <MathRenderer
                  key={key++}
                  latex={block.latex || block.content}
                  display="block"
                  color={color}
                  style={styles.blockMath}
                />
              );
            }
          }
          } else {
            // Inline math - add to current text group
            if (isStreaming) {
              currentTextGroup.push(
                <Text key={currentTextKey++} style={[styles.placeholderText, { color }]}>
                  ⏳
                </Text>
              );
            } else {
              // Wrap inline math with RLM to prevent RTL reversal
              const safeLatex = `${RLM}${block.latex || block.content}${RLM}`;
              currentTextGroup.push(
                <MathRenderer
                  key={currentTextKey++}
                  latex={safeLatex}
                  display="inline"
                  color={color}
                  style={[styles.inlineMath, { marginHorizontal: 2, flexShrink: 0 }]}
                />
              );
            }
          }
      }
    });

    // Flush remaining text group
    if (currentTextGroup.length > 0) {
      result.push(
        <View key={key++} style={[
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'flex-start',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            width: '100%',
            minWidth: 0,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }
        ]}>
          {currentTextGroup}
        </View>
      );
    }

    return result;
  };

  const renderedBlocks = renderBlocks();

  // If single text block with no markdown, return simple Text
  if (blocks.length === 1 && blocks[0].type === 'text') {
    const hasMarkdown = /\*\*|\*|`/.test(blocks[0].content);
    if (!hasMarkdown) {
      return (
        <Text style={[style, { textAlign, writingDirection: 'rtl' }]}>
          {blocks[0].content}
        </Text>
      );
    }
  }

  return (
    <View style={styles.container}>
      {renderedBlocks}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  blockMath: {
    marginVertical: 0, // Margin handled by container
  },
  standaloneMathContainer: {
    width: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  mathPlaceholder: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 2,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  placeholderText: {
    fontSize: 12,
    opacity: 0.7,
  },
});
