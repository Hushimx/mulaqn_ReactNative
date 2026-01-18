import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathRendererProps {
  latex: string;
  display?: 'inline' | 'block';
  color?: string;
  style?: any;
}

/**
 * MathRenderer - يرندر LaTeX باستخدام MathJax في WebView
 * 
 * القواعد:
 * - ممنوع rendering أثناء streaming
 * - يرندر مرة واحدة بعد end-of-stream
 * - LaTeX فقط داخل \(...\) و \[...\]
 * - Math دائماً LTR (حتى في RTL context)
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  latex,
  display = 'inline',
  color = '#FFFFFF',
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [height, setHeight] = useState(display === 'block' ? 60 : 30);
  const [renderFailed, setRenderFailed] = useState(false);

  // Escape HTML but preserve LaTeX backslashes
  const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // Normalize LaTeX: ensure proper delimiters
  const normalizedLatex = React.useMemo(() => {
    if (!latex) return '';
    
    let normalized = latex.trim();
    
    // Handle escaped delimiters: \\( and \\) should become \( and \)
    normalized = normalized.replace(/\\\\([()])/g, '\\$1');
    
    // Ensure \( and \) are correct (no spaces)
    normalized = normalized.replace(/\\\s*\(/g, '\\(');
    normalized = normalized.replace(/\\\s*\)/g, '\\)');
    
    return normalized;
  }, [latex]);

  const escapedLatex = escapeHtml(normalizedLatex);

  // Generate HTML content with MathJax
  const generateHtmlContent = (latexContent: string, mathDisplay: 'inline' | 'block') => {
    const delimiter = mathDisplay === 'block' ? '\\[' : '\\(';
    const endDelimiter = mathDisplay === 'block' ? '\\]' : '\\)';
    
    return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${mathDisplay === 'block' ? '16px' : '15px'};
            line-height: 1.5;
            color: ${color};
            background: transparent;
            padding: ${mathDisplay === 'block' ? '8px 0' : '2px 0'};
            margin: 0;
            overflow-x: auto;
            overflow-y: hidden;
            width: 100%;
            max-width: 100%;
            display: block;
            direction: ltr;
            text-align: ${mathDisplay === 'block' ? 'center' : 'left'};
        }
        #math-content {
            width: 100%;
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            box-sizing: border-box;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            min-height: ${mathDisplay === 'block' ? '40px' : '20px'};
        }
        .MathJax, .MathJax_Display {
            color: ${color} !important;
            max-width: 100% !important;
            overflow-x: auto;
            overflow-y: hidden;
        }
        .MathJax {
            display: inline-block !important;
            margin: 0 0.2em !important;
        }
        .MathJax_Display {
            margin: 0.5em 0 !important;
            text-align: center;
        }
    </style>
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['\\\\(', '\\\\)']],
                displayMath: [['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
                ignoreHtmlClass: 'tex2jax_ignore'
            }
        };
    </script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
    <div id="math-content">${delimiter}${latexContent}${endDelimiter}</div>
    <script>
        function renderMathJax() {
            const content = document.getElementById('math-content');
            if (!content) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'rendered',
                    height: ${mathDisplay === 'block' ? '60' : '30'},
                    success: false
                }));
                return;
            }
            
            function sendHeight() {
                setTimeout(function() {
                    const contentHeight = content.offsetHeight || content.scrollHeight || content.clientHeight;
                    let finalHeight = Math.max(contentHeight, ${mathDisplay === 'block' ? '40' : '20'});
                    
                    // Cap at reasonable maximum
                    finalHeight = Math.min(finalHeight, ${mathDisplay === 'block' ? '1000' : '200'});
                    finalHeight = Math.max(finalHeight, ${mathDisplay === 'block' ? '40' : '20'});
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'rendered',
                        height: finalHeight,
                        success: true
                    }));
                }, 50);
            }
            
            if (window.MathJax && window.MathJax.typesetPromise) {
                MathJax.typesetPromise([content]).then(function() {
                    setTimeout(function() {
                        const contentHeight = content.offsetHeight || content.scrollHeight || content.clientHeight;
                        const finalHeight = Math.min(Math.max(contentHeight, ${mathDisplay === 'block' ? '40' : '20'}), ${mathDisplay === 'block' ? '1000' : '200'});
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'rendered',
                            height: finalHeight,
                            success: true
                        }));
                    }, 150);
                }).catch(function(err) {
                    console.error('MathJax rendering error:', err);
                    sendHeight();
                });
            } else {
                sendHeight();
            }
        }
        
        // Wait for MathJax to load
        if (window.MathJax && window.MathJax.typesetPromise) {
            renderMathJax();
        } else {
            const checkMathJax = setInterval(function() {
                if (window.MathJax && window.MathJax.typesetPromise) {
                    clearInterval(checkMathJax);
                    renderMathJax();
                }
            }, 100);
            
            setTimeout(function() {
                clearInterval(checkMathJax);
                renderMathJax();
            }, 3000);
        }
    </script>
</body>
</html>
    `;
  };

  const htmlContent = React.useMemo(() => {
    return generateHtmlContent(escapedLatex, display);
  }, [escapedLatex, display, color]);

  // Handle WebView messages (height updates)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'rendered' && data.height) {
        setHeight(data.height);
        if (!data.success) {
          setRenderFailed(true);
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Estimate initial height
  useEffect(() => {
    if (latex && latex.trim().length > 0) {
      setRenderFailed(false);
      const estimatedHeight = display === 'block' 
        ? Math.max(60, Math.min(latex.length * 2, 200))
        : Math.max(30, Math.min(latex.length * 1.5, 100));
      setHeight(estimatedHeight);
    } else {
      setHeight(display === 'block' ? 60 : 30);
    }
  }, [latex, display]);

  // Fallback: إذا فشل WebView، عرض LaTeX كـ text (fallback بسيط)
  if (renderFailed) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={[styles.fallbackText, { color }]}>
          {display === 'block' ? '\\[' : '\\('}
          {latex}
          {display === 'block' ? '\\]' : '\\)'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webView, { height }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        // Disable zoom
        scalesPageToFit={false}
        // Performance optimizations
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  fallbackContainer: {
    padding: 4,
    minHeight: 20,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});

