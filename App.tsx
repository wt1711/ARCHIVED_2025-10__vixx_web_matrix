import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiCheckInstagram, apiConnectInstagram } from './src/api';
import { DMListScreen } from './src/screens/DMListScreen';
import { DMDetailScreen } from './src/screens/DMDetailScreen';   

type Screen = 'home' | 'dm-list' | 'dm-detail';

export default function App() {
  const [showWebView, setShowWebView] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [cookies, setCookies] = useState<any>(null);
  const webViewRef = useRef<WebView>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [matrixCredentials, setMatrixCredentials] = useState<{
    userId?: string;
    deviceId?: string;
    accessToken?: string;
    matrixHost?: string;
  } | null>(null);
  const [isInstagramConnected, setIsInstagramConnected] = useState<boolean | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const autoConnectAttemptedRef = useRef(false);

  const handleOpenInstagram = () => {
    setShowWebView(true);
  };

  const handleCloseWebView = () => {
    setShowWebView(false);
  };

  useEffect(() => {
    // Load token and matrix credentials from storage on start
    (async () => {
      const saved = await AsyncStorage.getItem('accessToken');
      if (saved) {
        setToken(saved);
      }
      const savedMatrix = await AsyncStorage.getItem('matrixCredentials');
      if (savedMatrix) {
        try {
          setMatrixCredentials(JSON.parse(savedMatrix));
        } catch (e) {
          console.error('Failed to parse matrix credentials', e);
        }
      }
    })();
  }, []);

  useEffect(() => {
    // Whenever token exists, check instagram status
    const check = async () => {
      if (!token) return;
      setLoadingCheck(true);
      try {
        const res = await apiCheckInstagram(token);
        setIsInstagramConnected(res.isInstagramConnected);
      } catch (e: any) {
        console.error('check instagram failed', e?.message || e);
        Alert.alert('Error', 'Failed to check Instagram status');
      } finally {
        setLoadingCheck(false);
      }
    };
    check();
  }, [token]);

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
      if (isInstagramConnected || !showWebView) return;
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

  const handleLoginSubmit = async () => {
    try {
      setIsLoggingIn(true);
      if (!username || !password) {
        Alert.alert('Missing credentials', 'Please enter username and password');
        return;
      }
      const res = await apiLogin(username, password);
      const accessToken = res.accessToken || res.user.accessToken;
      await AsyncStorage.setItem('accessToken', accessToken);
      setToken(accessToken);
      
      // Store Matrix credentials if provided (check top level first, then user object)
      const userId = res.userId;
      const deviceId = res.deviceId;
      const matrixHost = res.matrixHost;
      
      if (userId && deviceId && matrixHost && accessToken) {
        const matrixCreds = {
          userId,
          deviceId,
          accessToken,
          matrixHost,
        };
        await AsyncStorage.setItem('matrixCredentials', JSON.stringify(matrixCreds));
        setMatrixCredentials(matrixCreds);
      }
      
      Alert.alert('Login success', `Welcome ${res.user.username}`);
    } catch (e: any) {
      console.error('login failed', e?.message || e);
      Alert.alert('Login failed', e?.message || 'Unknown error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConnectInstagram = async () => {
    try {
      setIsConnecting(true);
      if (!token) {
        Alert.alert('Not logged in', 'Please login first');
        return;
      }
      const {payload, isValidCookies} = validateCookiesToSync();
      console.log('payload:', payload, isValidCookies, cookies);
      if (!isValidCookies) {
        Alert.alert('Missing cookies', 'Please log in to Instagram and extract cookies first');
        return;
      }
      if (!payload.sessionid || !payload.ig_did) {
        Alert.alert('Missing cookies', 'Please log in to Instagram and extract cookies first');
        return;
      }
      const res = await apiConnectInstagram(token, payload);
      if (res.success) {
        Alert.alert('Connected', res.message || 'Instagram connected');
        setIsInstagramConnected(true);
        setSyncReady(false);
        setShowWebView(false);
        apiCheckInstagram(token).catch(console.error);
      } else {
        Alert.alert('Failed', res.message || 'Unable to connect Instagram');
      }
    } catch (e: any) {
      console.error('connect failed', e?.message || e);
      Alert.alert('Connect failed', e?.message || 'Unknown error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshInstagram = async () => {
    if (!token) return;
    setRefreshing(true);
    setLoadingCheck(true);
    try {
      const res = await apiCheckInstagram(token);
      setIsInstagramConnected(res.isInstagramConnected);
    } catch (e: any) {
      console.error('refresh check failed', e?.message || e);
      Alert.alert('Error', 'Failed to refresh Instagram status');
    } finally {
      setLoadingCheck(false);
      setRefreshing(false);
    }
  };

  const handleOpenDM = () => {
    setCurrentScreen('dm-list');
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setCurrentScreen('dm-detail');
  };

  const handleBackFromDM = () => {
    if (currentScreen === 'dm-detail') {
      setCurrentScreen('dm-list');
      setSelectedRoomId(null);
    } else {
      setCurrentScreen('home');
    }
  };

  useEffect(() => {
    if (cookies && !syncReady) {
      handleConnectInstagram();
      setSyncReady(true);
    }
  },[cookies]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show DM screens as full screen overlays
  if (currentScreen === 'dm-list' || currentScreen === 'dm-detail') {
    return (
      <SafeAreaProvider>
        {currentScreen === 'dm-list' && (
          <DMListScreen
            onSelectRoom={handleSelectRoom}
            onClose={handleBackFromDM}
          />
        )}
        {currentScreen === 'dm-detail' && selectedRoomId && (
          <DMDetailScreen
            roomId={selectedRoomId}
            onBack={handleBackFromDM}
          />
        )}
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top','bottom']} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefreshInstagram} />}
        >
        {!token ? (
          <>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Enter credentials to continue</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={[styles.button, isLoggingIn && styles.buttonDisabled]} onPress={handleLoginSubmit} disabled={isLoggingIn}>
              <Text style={styles.buttonText}>{isLoggingIn ? 'Logging in…' : 'Login'}</Text>
            </TouchableOpacity>
            {isLoggingIn && <ActivityIndicator style={styles.loadingIndicator} />}
          </>
        ) : (
          <>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Instagram status: {loadingCheck ? 'Checking…' : isInstagramConnected ? 'Connected' : 'Not Connected'}</Text>

            {matrixCredentials && (
              <TouchableOpacity style={styles.button} onPress={handleOpenDM}>
                <Text style={styles.buttonText}>Direct Messages</Text>
              </TouchableOpacity>
            )}
            {isInstagramConnected ? (
              <TouchableOpacity style={[styles.button, loadingCheck && styles.buttonDisabled]} onPress={handleOpenDM} disabled={loadingCheck}>
                <Text style={styles.buttonText}>Open Instagram DM</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.button, loadingCheck && styles.buttonDisabled]} onPress={handleOpenInstagram} disabled={loadingCheck}>
                <Text style={styles.buttonText}>Connect to Instagram</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaProvider>
          <SafeAreaView edges={['top','bottom']} style={styles.modalContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseWebView} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              {syncReady && !!token ? (
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
      
    </SafeAreaView>
    </SafeAreaProvider>
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