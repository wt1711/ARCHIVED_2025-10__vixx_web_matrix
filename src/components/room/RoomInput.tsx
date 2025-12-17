import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { EventType, MsgType, Room } from 'matrix-js-sdk';
import { getMatrixClient } from '../../matrixClient';

type RoomInputProps = {
  room: Room;
};

export function RoomInput({ room }: RoomInputProps) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const mx = getMatrixClient();

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !mx || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await mx.sendEvent(room.roomId, EventType.RoomMessage, {
        msgtype: MsgType.Text,
        body: text,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore text on error
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, mx, room, sending]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={5000}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#E4405F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});


