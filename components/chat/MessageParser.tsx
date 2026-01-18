/**
 * MessageParser - يقسم الرسالة إلى TextBlocks و MathBlocks
 * 
 * Source of Truth: LaTeX فقط داخل \(...\) و \[...\]
 * ممنوع أي تحويل Unicode كمسار أساسي
 */

export interface MessageBlock {
  type: 'text' | 'math';
  content: string;
  display?: 'inline' | 'block';
  latex?: string;
}

/**
 * يقسم الرسالة إلى blocks:
 * - TextBlock: نص عادي
 * - MathBlock: معادلة LaTeX (inline أو block)
 */
export function parseMessage(text: string): MessageBlock[] {
  if (!text) return [];

  const blocks: MessageBlock[] = [];
  let currentIndex = 0;

  // Regex patterns للـ LaTeX delimiters
  // Inline: \(...\) - use non-greedy match to handle nested parentheses
  const inlineMathRegex = /\\\(((?:[^\\]|\\.)*?)\\\)/g;
  // Block: \[...\] - use non-greedy match to handle nested brackets
  const blockMathRegex = /\\\[((?:[^\\]|\\.)*?)\\\]/g;

  // جمع جميع matches مع مواقعها
  const matches: Array<{
    start: number;
    end: number;
    content: string;
    display: 'inline' | 'block';
  }> = [];

  // Find inline math
  let match;
  inlineMathRegex.lastIndex = 0;
  while ((match = inlineMathRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1], // المحتوى بدون delimiters
      display: 'inline',
    });
  }

  // Find block math
  blockMathRegex.lastIndex = 0;
  while ((match = blockMathRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1], // المحتوى بدون delimiters
      display: 'block',
    });
  }

  // ترتيب matches حسب الموقع
  matches.sort((a, b) => a.start - b.start);

  // بناء blocks
  matches.forEach((mathMatch) => {
    // إضافة text block قبل math (إن وجد)
    if (mathMatch.start > currentIndex) {
      const textContent = text.substring(currentIndex, mathMatch.start);
      if (textContent.trim()) {
        blocks.push({
          type: 'text',
          content: textContent,
        });
      }
    }

    // إضافة math block
    blocks.push({
      type: 'math',
      content: mathMatch.content,
      display: mathMatch.display,
      latex: mathMatch.content, // LaTeX content
    });

    currentIndex = mathMatch.end;
  });

  // إضافة text block المتبقي (إن وجد)
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText.trim()) {
      blocks.push({
        type: 'text',
        content: remainingText,
      });
    }
  }

  // إذا لم يكن هناك math blocks، إرجاع text block واحد
  if (blocks.length === 0) {
    blocks.push({
      type: 'text',
      content: text,
    });
  }

  return blocks;
}

