import React from 'react';
import { Text, TextStyle, View, StyleSheet } from 'react-native';

/**
 * Parse HTML content and convert to React Native components
 * Supports: <b>, <strong>, <i>, <em>, <u>, <law>, <formula>, <span style="color: ...">
 * Returns an array of components that can be used inside a parent View/Text component
 * 
 * @param html المحتوى HTML المراد تحويله
 * @param baseStyle التنسيق الأساسي للنص
 * @param studentName اسم الطالب (اختياري) - يتم استبدال {student_name} به
 */
export function parseHTMLToText(html: string, baseStyle?: TextStyle, studentName?: string): React.ReactNode[] {
  if (!html) return [];

  // استبدال {student_name} باسم الطالب قبل المعالجة
  if (studentName) {
    html = html.replace(/{student_name}/gi, studentName);
  }

  // Remove unwanted tags but keep b, strong, i, em, u, law, formula, span
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  const parts: React.ReactNode[] = [];
  let keyIndex = 0;

  // First, extract <law> and <formula> tags (special boxes)
  const lawRegex = /<law[^>]*>([\s\S]*?)<\/law>/gi;
  const formulaRegex = /<formula[^>]*>([\s\S]*?)<\/formula>/gi;
  
  // Replace law/formula tags with placeholders
  const placeholders: { [key: string]: string } = {};
  let placeholderIndex = 0;
  
  cleaned = cleaned.replace(lawRegex, (match, content) => {
    const placeholder = `__LAW_PLACEHOLDER_${placeholderIndex}__`;
    placeholders[placeholder] = content.trim();
    placeholderIndex++;
    return placeholder;
  });
  
  cleaned = cleaned.replace(formulaRegex, (match, content) => {
    const placeholder = `__LAW_PLACEHOLDER_${placeholderIndex}__`;
    placeholders[placeholder] = content.trim();
    placeholderIndex++;
    return placeholder;
  });

  // Split by placeholders and process
  const segments = cleaned.split(/(__LAW_PLACEHOLDER_\d+__)/);
  
  segments.forEach((segment) => {
    if (segment.startsWith('__LAW_PLACEHOLDER_') && placeholders[segment]) {
      // Render law/formula box
      const lawContent = placeholders[segment];
      const lawParts = parseInlineHTML(lawContent, baseStyle);
      parts.push(
        <View
          key={`law-${keyIndex++}`}
          style={styles.lawBox}
        >
          <Text style={styles.lawText}>
            {lawParts}
          </Text>
        </View>
      );
    } else if (segment.trim()) {
      // Handle bullet points - convert • to line breaks for proper display
      let processedSegment = segment;
      if (segment.includes('•')) {
        // Add line break before each bullet point (except first)
        processedSegment = segment.replace(/([^\n])(•\s+)/g, '$1\n$2');
      }
      
      // Parse regular HTML content
      const inlineParts = parseInlineHTML(processedSegment, baseStyle);
      if (Array.isArray(inlineParts) && inlineParts.length > 0) {
        // If we have bullet points, wrap each line in a View
        if (processedSegment.includes('\n') && processedSegment.includes('•')) {
          // Split by newlines and render each bullet point separately
          const lines = processedSegment.split('\n');
          lines.forEach((line, lineIndex) => {
            if (line.trim()) {
              if (line.trim().startsWith('•')) {
                // This is a bullet point line
                const bulletParts = parseInlineHTML(line.trim(), baseStyle);
                parts.push(
                  <View key={`bullet-${keyIndex++}`} style={{ marginBottom: 8, paddingRight: 12 }}>
                    <Text style={baseStyle}>
                      {bulletParts}
                    </Text>
                  </View>
                );
              } else {
                // Regular text line
                const textParts = parseInlineHTML(line, baseStyle);
                if (Array.isArray(textParts) && textParts.length > 0) {
                  if (textParts.length === 1) {
                    parts.push(textParts[0]);
                  } else {
                    parts.push(
                      <Text key={`text-${keyIndex++}`} style={baseStyle}>
                        {textParts}
                      </Text>
                    );
                  }
                }
              }
            }
          });
        } else {
          // No bullets or newlines - render normally
          if (inlineParts.length === 1) {
            parts.push(inlineParts[0]);
          } else {
            parts.push(
              <Text key={`text-wrapper-${keyIndex++}`} style={baseStyle}>
                {inlineParts}
              </Text>
            );
          }
        }
      } else if (inlineParts && !Array.isArray(inlineParts)) {
        parts.push(inlineParts);
      }
    }
  });

  return parts;
}

/**
 * Parse inline HTML (b, strong, i, em, u, span with color)
 */
function parseInlineHTML(html: string, baseStyle?: TextStyle): React.ReactNode[] {
  if (!html) return [];
  
  const parts: React.ReactNode[] = [];
  let textBuffer = '';
  let activeTags: Set<string> = new Set();
  let activeColor: string | null = null;

  // Regex to match tags or text
  const regex = /(<\/?[a-z]+[^>]*>)|([^<]+)/gi;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      // It's a tag
      const tagMatch = match[1];
      const tagNameMatch = tagMatch.match(/<\/?([a-z]+)/i);
      if (tagNameMatch) {
        const tagName = tagNameMatch[1].toLowerCase();
        const isClosing = tagMatch.startsWith('</');

        if (tagName === 'span') {
          // Handle <span style="color: ...">
          if (!isClosing) {
            const colorMatch = tagMatch.match(/color:\s*([^;"]+)/i);
            if (colorMatch) {
              // Push text before tag
              if (textBuffer) {
                parts.push(createTextNode(textBuffer, baseStyle, activeTags, activeColor, keyIndex++));
                textBuffer = '';
              }
              activeColor = colorMatch[1].trim();
            }
          } else {
            // Push text before closing tag
            if (textBuffer) {
              parts.push(createTextNode(textBuffer, baseStyle, activeTags, activeColor, keyIndex++));
              textBuffer = '';
            }
            activeColor = null;
          }
        } else if (['b', 'strong', 'i', 'em', 'u'].includes(tagName)) {
          // Push text before tag
          if (textBuffer) {
            parts.push(createTextNode(textBuffer, baseStyle, activeTags, activeColor, keyIndex++));
            textBuffer = '';
          }

          if (isClosing) {
            activeTags.delete(tagName);
          } else {
            activeTags.add(tagName);
          }
        }
      }
    } else if (match[2]) {
      // It's text
      textBuffer += match[2];
    }
  }

  // Push remaining text
  if (textBuffer) {
    parts.push(createTextNode(textBuffer, baseStyle, activeTags, activeColor, keyIndex++));
  }

  return parts;
}

/**
 * Create a Text node with appropriate styles
 */
function createTextNode(
  text: string,
  baseStyle?: TextStyle,
  activeTags?: Set<string>,
  color?: string | null,
  key?: number
): React.ReactNode {
  const style: TextStyle = { ...baseStyle };
  
  if (activeTags?.has('b') || activeTags?.has('strong')) {
    style.fontWeight = '700';
    style.color = '#FFFFFF';
  }
  if (activeTags?.has('i') || activeTags?.has('em')) {
    style.fontStyle = 'italic';
  }
  if (activeTags?.has('u')) {
    style.textDecorationLine = 'underline';
  }
  if (color) {
    style.color = color;
  }
  
  return (
    <Text key={`text-${key}`} style={style}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  lawBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // أخضر شفاف فاتح
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981', // حدود باللون الأخضر الحالي
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lawText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
});

/**
 * Simple function to strip HTML tags and return plain text
 */
export function stripHTML(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}
