import React, { useState } from "react";
import { View, StyleSheet, StatusBar, Image, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoginInstagramModal from "../components/LoginInstagramModal";
import { InstagramIcon } from 'lucide-react-native';
import { AuthService } from "../services/apiService";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const [isLoading, setIsLoading] = useState(false);
    const authService = AuthService.getInstance();
    const { restoreSession, matrixToken } = useAuth();

    const handleLogin = async (cookies: Record<string, string>) => {
      setIsLoading(true);
      console.log('Login with cookies:', cookies);
      const result = await authService.login(cookies);
      if (result) {
        console.log('Login successful');
        await restoreSession();
      } else {
        console.log('Login failed');
        setIsLoading(false);
        return
      }
      setOpen(false);
      setIsLoading(false);
    }

  return (
    <View
    style={[
      styles.container,
      { paddingTop: insets.top, paddingBottom: insets.bottom },
    ]}
  >
    <View
      style={[styles.loginView]}
    />
    <StatusBar barStyle="light-content" />
    <View style={styles.content}>
      <Image
        source={{
          uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/90ic679nh3wp43mbosisg',
        }}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          disabled={isLoading}
          activeOpacity={0.8}
          style={styles.button}
        >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.blurButton}>
                <InstagramIcon color="#FFFFFF" size={24} />
                <Text style={styles.buttonText}>Login with Instagram</Text>
              </View>
            )}
        </TouchableOpacity>
      </View>
    </View>
    <LoginInstagramModal open={open} onClose={() => setOpen(false)} onSubmit={handleLogin} isInstagramConnected={matrixToken !== null} isConnecting={isLoading} />
  </View>
  );
}



const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    logo: {
      width: 200,
      height: 200,
      position: 'absolute',
      top: '25%',
    },
    buttonContainer: {
      width: '70%',
      maxWidth: 400,
      position: 'absolute',
      top: '55%',
    },
    button: {
      borderRadius: 20,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      gap: 12,
    },
    blurButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      gap: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    loginView: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#000000',
    },
  });
  