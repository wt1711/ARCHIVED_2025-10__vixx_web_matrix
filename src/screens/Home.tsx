import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet, BackHandler, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DirectMessageListScreen } from './DirectMessageListScreen';
import { DirectMessageDetailScreen } from './DirectMessageDetailScreen';
import Login from './Login';

type Screen = 'login' | 'list' | 'detail';

export default function Home() {
  const { matrixToken, isLoading } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Determine current screen for navigation logic
  const currentScreen: Screen = !matrixToken 
    ? 'login' 
    : selectedRoomId 
    ? 'detail' 
    : 'list';

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If on detail screen, go back to list
      if (currentScreen === 'detail' && selectedRoomId) {
        setSelectedRoomId(null);
        return true; // Prevent default back behavior
      }
      // If on list screen, allow default back behavior (exit app)
      return false;
    });

    return () => backHandler.remove();
  }, [currentScreen, selectedRoomId]);

  const handleBack = () => {
    setSelectedRoomId(null);
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E4405F" />
          <Text style={styles.loadingText}>Loading session…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {!matrixToken ? (
        <Login />
      ) : selectedRoomId ? (
        <DirectMessageDetailScreen
          roomId={selectedRoomId}
          onBack={handleBack}
        />
      ) : (
        <DirectMessageListScreen onSelectRoom={handleSelectRoom} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#555',
  },
});
