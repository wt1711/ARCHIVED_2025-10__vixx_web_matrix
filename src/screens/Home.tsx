import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { DirectMessageListScreen } from './DirectMessageListScreen';
import { DirectMessageDetailScreen } from './DirectMessageDetailScreen';
import Login from './Login';


export default function Home() {
  const { matrixToken} = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  return (
    <SafeAreaProvider>
        {!matrixToken ? (
          <Login />
        ) : 
          selectedRoomId ? (
            <DirectMessageDetailScreen
              roomId={selectedRoomId}
              onBack={() => setSelectedRoomId(null)}
            />
          ) : (
            <DirectMessageListScreen onSelectRoom={setSelectedRoomId} />
          )}
    </SafeAreaProvider>
  );
}