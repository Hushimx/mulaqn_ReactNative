import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathJaxTextProps {
  text: string;
  color?: string;
  style?: any;
}

/**
 * Component to render text with MathJax support using WebView
 * This is necessary because React Native doesn't support MathJax natively
 */
// Escape HTML function - but preserve LaTeX backslashes
// We only escape HTML special characters, not backslashes (needed for LaTeX)
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  // Only escape HTML special characters, preserve backslashes for LaTeX
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export const MathJaxText: React.FC<MathJaxTextProps> = ({ 
  text, 
  color = '#FFFFFF',
  style
}) => {
  const webViewRef = useRef<WebView>(null);

  // Normalize text: handle LaTeX properly
  const normalizedText = React.useMemo(() => {
    if (!text) return '';
    
    let normalized = text;
    
    // Handle escaped LaTeX delimiters: \\( and \\) should become \( and \)
    normalized = normalized.replace(/\\\\([()])/g, '\\$1');
    
    // Ensure \( and \) are correct (no spaces)
    normalized = normalized.replace(/\\\s*\(/g, '\\(');
    normalized = normalized.replace(/\\\s*\)/g, '\\)');
    
    return normalized;
  }, [text]);

  const escapedText = escapeHtml(normalizedText);
  
  // Generate HTML content - this will be used for initial load
  const generateHtmlContent = (content: string) => `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
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
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 15px;
                line-height: 1.5;
                color: ${color};
                background: transparent;
                padding: 0;
                margin: 0;
                overflow-x: hidden;
                word-wrap: break-word;
                overflow-wrap: break-word;
                width: 100%;
                max-width: 100%;
                display: block;
                visibility: visible;
                min-height: auto;
                height: auto;
            }
            #content {
                width: 100%;
                max-width: 100%;
                word-wrap: break-word;
                overflow-wrap: break-word;
                box-sizing: border-box;
                padding: 0;
                margin: 0;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                white-space: normal;
                line-height: 1.5;
                min-height: 20px;
            }
            p {
                margin: 0;
                padding: 0;
                word-wrap: break-word;
                overflow-wrap: break-word;
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
        <div id="content" style="display: block; width: 100%;">${escapedText}</div>
        <script>
            // Function to render MathJax
            function renderMathJax() {
                const content = document.getElementById('content');
                if (!content) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'rendered',
                        height: 30
                    }));
                    return;
                }
                
                function sendHeight() {
                    setTimeout(function() {
                        const contentHeight = content.offsetHeight || content.scrollHeight || content.clientHeight;
                        let finalHeight = Math.max(contentHeight, 20);
                        
                        // If height is still 0 or too small, try to calculate based on text
                        if (finalHeight < 20) {
                            const textContent = content.textContent || content.innerText || '';
                            const lines = textContent.split('\n').length;
                            const estimatedHeight = Math.max(20, lines * 22);
                            finalHeight = Math.min(estimatedHeight, 1000);
                        }
                        
                        // Cap at reasonable maximum (reduce from 2000 to 800 to prevent large empty spaces)
                        finalHeight = Math.min(finalHeight, 800);
                        const finalHeightValue = Math.max(finalHeight, 30); // Minimum 30px
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'rendered',
                            height: finalHeightValue
                        }));
                    }, 50);
                }
                
                if (window.MathJax && window.MathJax.typesetPromise) {
                    MathJax.typesetPromise([content]).then(function() {
                        // Wait a bit for MathJax to finish rendering
                        setTimeout(function() {
                            const contentHeight = content.offsetHeight || content.scrollHeight || content.clientHeight;
                            const finalHeight = Math.min(Math.max(contentHeight, 30), 800);
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'rendered',
                                height: finalHeight
                            }));
                        }, 150);
                    }).catch(function(err) {
                        console.error('MathJax rendering error:', err);
                        // Still send height even if MathJax fails
                        sendHeight();
                    });
                } else {
                    // Fallback if MathJax doesn't load - still show text
                    sendHeight();
                }
            }
            
            // Ensure content is visible immediately
            var content = document.getElementById('content');
            if (content) {
                content.style.display = 'block';
                content.style.visibility = 'visible';
                content.style.opacity = '1';
            }
            
            // Wait for MathJax script to load
            if (window.MathJax && window.MathJax.typesetPromise) {
                // MathJax already loaded
                renderMathJax();
            } else {
                // Wait for MathJax to load
                const checkMathJax = setInterval(function() {
                    if (window.MathJax && window.MathJax.typesetPromise) {
                        clearInterval(checkMathJax);
                        renderMathJax();
                    }
                }, 100);
                
                // Timeout after 3 seconds
                setTimeout(function() {
                    clearInterval(checkMathJax);
                    renderMathJax();
                }, 3000);
            }
        </script>
    </body>
    </html>
  `;

  // Generate HTML content - update when text changes
  const htmlContent = React.useMemo(() => {
    return generateHtmlContent(escapedText);
  }, [escapedText]);

  const [height, setHeight] = React.useState(30);
  const [renderFailed, setRenderFailed] = React.useState(false);

  // Calculate initial height estimate - this is critical for preventing empty space
  React.useEffect(() => {
    if (text && text.trim().length > 0) {
      setRenderFailed(false);
      const lines = text.split('\n').length;
      const charCount = text.length;
      const estimatedLines = Math.max(lines, Math.ceil(charCount / 35));
      const estimatedHeight = Math.min(Math.max(estimatedLines * 22 + 10, 30), 1000);
      setHeight(estimatedHeight);
    } else {
      setHeight(30);
    }
  }, [text]);



  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'rendered' && data.height) {
        // Limit height to reasonable maximum
        const maxHeight = 1000;
        const calculatedHeight = Math.min(data.height, maxHeight);
        const finalHeight = Math.max(calculatedHeight, 30); // Minimum 30px
        setHeight(finalHeight);
        setRenderFailed(false);
      } else if (data.type === 'error') {
        // If MathJax fails, mark as failed but still show content
        setRenderFailed(true);
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  // Show plain text as fallback while WebView loads
  const [webViewReady, setWebViewReady] = React.useState(false);
  const [contentRendered, setContentRendered] = React.useState(false);
  const [webViewVisible, setWebViewVisible] = React.useState(false);

  // Reset states when text changes
  React.useEffect(() => {
    setWebViewReady(false);
    setContentRendered(false);
    setWebViewVisible(false);
  }, [text]);

  // Always show placeholder text in background - WebView appears on top when ready
  return (
    <View style={[styles.container, style, { minHeight: Math.max(height, 30) }]}>
      {/* Always show plain text in background - this prevents empty space */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, backgroundColor: 'transparent' }}>
        <Text style={[style, { opacity: webViewVisible ? 0 : 1 }]} numberOfLines={0}>
          {text}
        </Text>
      </View>
      {/* WebView appears on top when ready and content is rendered */}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webview, { height: Math.max(height, 30), opacity: webViewVisible ? 1 : 0, zIndex: 2 }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(event) => {
          handleMessage(event);
          // When we receive height, content is rendered
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'rendered' && data.height && data.height > 30) {
              // Only show WebView if we got a valid height (content is actually rendered)
              setContentRendered(true);
              // Wait a bit more to ensure WebView is fully ready, then show it
              setTimeout(() => {
                setWebViewVisible(true);
              }, 300);
            }
          } catch (e) {
            // Ignore
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        scalesPageToFit={false}
        bounces={false}
        nestedScrollEnabled={false}
        onLoadStart={() => {
          setWebViewReady(false);
          setContentRendered(false);
          setWebViewVisible(false);
        }}
        onLoadEnd={() => {
          // Mark WebView as loaded
          setWebViewReady(true);
          
          // Ensure WebView is fully ready before showing it
          setTimeout(() => {
            if (webViewRef.current && text) {
              const script = `
                (function() {
                  var content = document.getElementById('content');
                  if (content) {
                    // Force visibility
                    content.style.display = 'block';
                    content.style.visibility = 'visible';
                    content.style.opacity = '1';
                    
                    // Send height immediately
                    setTimeout(function() {
                      var h = content.offsetHeight || content.scrollHeight || content.clientHeight;
                      if (h < 30) {
                        var textContent = content.textContent || content.innerText || '';
                        var lines = textContent.split('\\n').length;
                        h = Math.max(30, lines * 22);
                      }
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'rendered',
                        height: Math.min(Math.max(h, 30), 1000)
                      }));
                    }, 50);
                    
                    // Render MathJax
                    if (window.MathJax && window.MathJax.typesetPromise) {
                      MathJax.typesetPromise([content]).then(function() {
                        setTimeout(function() {
                          var h = content.offsetHeight || content.scrollHeight || content.clientHeight;
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'rendered',
                            height: Math.min(Math.max(h, 30), 1000)
                          }));
                        }, 100);
                      }).catch(function() {
                        var h = content.offsetHeight || content.scrollHeight || content.clientHeight;
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'rendered',
                          height: Math.min(Math.max(h, 30), 1000)
                        }));
                      });
                    } else {
                      // MathJax not loaded yet, send height anyway
                      setTimeout(function() {
                        var h = content.offsetHeight || content.scrollHeight || content.clientHeight;
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'rendered',
                          height: Math.min(Math.max(h, 30), 1000)
                        }));
                      }, 100);
                    }
                  }
                })();
              `;
              webViewRef.current.injectJavaScript(script);
            }
          }, 100);
        }}
        onError={() => {
          // If WebView fails, just keep showing plain text (placeholder)
          setWebViewVisible(false);
          setRenderFailed(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 50,
    maxHeight: 2000,
    overflow: 'hidden',
  },
  webview: {
    width: '100%',
    backgroundColor: 'transparent',
    flex: 0,
  },
});

