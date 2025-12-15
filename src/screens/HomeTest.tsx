import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRoomList } from '../hooks/useRoomList';
import { RoomListItem } from '../utils/roomTransformer';
import { DirectMessageListScreen } from './DirectMessageListScreen';
import { DirectMessageDetailScreen } from './DirectMessageDetailScreen';


export default function HomeTest() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { token, login, isLoading: isLoggingIn } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleLoginSubmit = async () => {
    try {
      await login(username, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top','bottom']} style={styles.container}>
        <ScrollView
        >
        {!token ? (
          <View style={styles.content}>
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
          </View>
        ) : 
          selectedRoomId ? (
            <DirectMessageDetailScreen
              roomId={selectedRoomId}
              onBack={() => setSelectedRoomId(null)}
            />
          ) : (
            <DirectMessageListScreen onSelectRoom={setSelectedRoomId} onClose={() => {}} />
          )}
      </ScrollView>
      
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


const RoomList = () => {
  const { rooms, isLoading: isLoadingRooms } = useRoomList();
  if (isLoadingRooms) {
    return <ActivityIndicator />;
  }
  return (
    <View>
      <Text>Room List {rooms.length}</Text>
      <FlatList
        data={rooms}
        renderItem={({ item }: { item: RoomListItem }) => <Text>{item.name}</Text>}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};