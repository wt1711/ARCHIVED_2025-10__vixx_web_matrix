import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

interface LoginInstagramModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (cookies: any) => void;
    isInstagramConnected: boolean;
    isConnecting: boolean;
}

export default function LoginInstagramModal({ open, onClose, onSubmit, isInstagramConnected, isConnecting }: LoginInstagramModalProps) {
  const [cookies, setCookies] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);
  const [syncReady, setSyncReady] = useState(false);
  const autoConnectAttemptedRef = useRef(false);

  const handleCloseWebView = () => {
    onClose();
  };

  const validateCookiesToSync = (newCookies?: any) => {
     const payload = {
        rur: getCookieVal('rur', newCookies) || '',
        ps_n: getCookieVal('ps_n', newCookies) || '',
        ps_l: getCookieVal('ps_l', newCookies) || '',
        ds_user_id: getCookieVal('ds_user_id', newCookies) || '',
        mid: getCookieVal('mid', newCookies) || '',
        ig_did: getCookieVal('ig_did', newCookies) || '',
        sessionid: getCookieVal('sessionid', newCookies) || '',
        datr: getCookieVal('datr', newCookies) || '',
        dpr: getCookieVal('dpr', newCookies) || '',
        wd: getCookieVal('wd', newCookies) || '',
        csrftoken: getCookieVal('csrftoken', newCookies) || '',
      };
      return {
        payload,
        isValidCookies: payload.ds_user_id && payload.sessionid && payload.rur && payload.ps_n && payload.ps_l && payload.mid && payload.ig_did,
      };
  }

  // Request cookies from the WebView via injected JavaScript (Expo Go compatible)
  const extractCookies = async () => {
    try {
      if (isInstagramConnected || !open) return;
      // First, get cookies via JavaScript (non-HttpOnly)
      webViewRef.current?.injectJavaScript(`
        (function() {
          try {
            var cookieStr = document.cookie || '';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'COOKIES', cookies: cookieStr }));
          } catch (e) {}
          true;
        })();
      `);

      // Also try to get all cookies including HttpOnly ones using CookieManager
      try {
        const allCookies = await CookieManager.get('https://www.instagram.com');
        console.log('All Instagram Cookies (including HttpOnly):', allCookies);

        const newCookies = Object.fromEntries(
          Object.entries(allCookies).map(([key, value]) => [key, value.value])
        );

        console.log('All Instagram Cookies (including HttpOnly) after parsed:', newCookies);
        
        // Update cookies state with all cookies
        const {isValidCookies} = validateCookiesToSync(newCookies);
        if (isValidCookies && !autoConnectAttemptedRef.current){
          autoConnectAttemptedRef.current = true;
          setCookies(newCookies);
        }
      } catch (cookieError) {
        console.error('Error getting cookies with CookieManager:', cookieError);
      }
    } catch (error) {
      console.error('Error requesting cookies:', error);
      Alert.alert('Error', 'Failed to request cookies');
    }
  };

  const onNavigationStateChange = (navState: any) => {
    // Check if user is logged in by looking at the URL
    if (navState.url.includes('instagram.com') && !navState.url.includes('login')) {
      console.log('User might be logged in, URL:', navState.url);
      extractCookies();
    }
  };

  const onMessage = (event: any) => {
    const raw = event.nativeEvent.data;
    let payload: any = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      // Fallback to string message
    }

    if (raw === 'LOGIN_SUCCESS' || payload?.type === 'LOGIN_SUCCESS') {
      console.log('Login detected!');
      return;
    }

    // if (payload?.type === 'COOKIES') {
    //   const parsed = parseCookieString(payload.cookies || '');
    //   console.log('Instagram Cookies (document.cookie):', parsed);
      
    //   // Merge with existing cookies from CookieManager if available
    //   if (cookies && typeof cookies === 'object') {
    //     setCookies({ ...cookies, ...parsed });
    //   } else {
    //     setCookies(parsed);
    //   }
    // }
  };

  const getCookieVal = (name: string, newCookies: any) => {
    const finalCookies = newCookies || cookies;
    if (!finalCookies) return undefined;
    const val = finalCookies[name];
    if (!val) return undefined;
    return typeof val === 'string' ? val : val?.value;
  };

  const handleConnectInstagram = () => {
    onSubmit(cookies);
  };

  useEffect(() => {
    if (cookies && !syncReady) {
      console.log('handleConnectInstagram');
        handleConnectInstagram();
      setSyncReady(true);
    }
  },[cookies]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaProvider>
          <SafeAreaView edges={['top','bottom']} style={styles.modalContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseWebView} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              {syncReady ? (
                <TouchableOpacity style={[styles.extractButton, isConnecting && styles.buttonDisabled]} onPress={handleConnectInstagram} disabled={isConnecting}>
                  <Text style={styles.extractButtonText}>{isConnecting ? 'Syncing your instagram…' : 'Sync Instagram'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            
            <WebView
              ref={webViewRef}
              source={{ uri: 'https://www.instagram.com/accounts/login/' }}
              style={styles.webview}
              onNavigationStateChange={onNavigationStateChange}
              onMessage={onMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#E4405F',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 1,
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#000',
  },
  cookieInfo: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  cookieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  cookieCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  smallButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4444',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#ff4444',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 18,
  },
  extractButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  extractButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
  cookieStatus: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 8,
  },
});