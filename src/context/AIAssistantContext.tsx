import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Room } from 'matrix-js-sdk';
import { getMatrixClient } from '../matrixClient';
import { getOpenAIConsultation, generateResponseFromMessage, gradeMessage } from '../services/aiService';

type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
};

type AIAssistantContextType = {
  // State
  inputValue: string;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  generatedResponse: string;
  isGeneratingResponse: boolean;
  isMobile: boolean;
  isAIAssistantOpen: boolean;
  prediction: { emoji: string; grade: string; score: number } | null;

  // Actions
  setInputValue: (value: string) => void;
  handleSend: () => void;
  generateInitialResponse: () => void;
  regenerateResponse: (spec?: object) => void;
  handleUseSuggestion: (response: string) => void;
  clearChatHistory: () => void;
  toggleAIAssistant: (isOpen?: boolean) => void;
  gradeEditorText: (text: string) => void;
};

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

type AIAssistantProviderProps = {
  children: ReactNode;
  room: Room;
  isMobile: boolean;
};

const isFromMe = (sender: string, selfUserId: string) => sender === selfUserId;

export function AIAssistantProvider({ children, room, isMobile }: AIAssistantProviderProps) {
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [prediction, setPrediction] = useState<{
    emoji: string;
    grade: string;
    score: number;
  } | null>(null);

  const mx = getMatrixClient();
  const myUserId = mx?.getUserId();

  const toggleAIAssistant = useCallback((isOpen?: boolean) => {
    setIsAIAssistantOpen((prev) => {
      const newIsOpen = isOpen ?? !prev;
      if (!newIsOpen) {
        setGeneratedResponse('');
      }
      return newIsOpen;
    });
  }, []);

  const handleUseSuggestion = useCallback(
    (response: string) => {
      if (response) {
        let cleanedResponse = response.trim();
        if (
          (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) ||
          (cleanedResponse.startsWith("'") && cleanedResponse.endsWith("'"))
        ) {
          cleanedResponse = cleanedResponse.substring(1, cleanedResponse.length - 1);
        }
        // In React Native, we would insert this into the message input
        // For now, we'll just set it as input value
        setInputValue(cleanedResponse);
        if (isMobile) {
          setIsAIAssistantOpen(false);
        }
      }
    },
    [isMobile]
  );

  const generateInitialResponse = useCallback(async () => {
    toggleAIAssistant(true);
    await regenerateResponse();
  }, [toggleAIAssistant]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerateResponse = useCallback(
    async (spec = {}) => {
      console.log('regenerateResponse called with spec:', spec);
      setIsGeneratingResponse(true);

      try {
        if (!mx || !myUserId) return;

        // Get the actual room conversation from timeline
        const timeline = room.getLiveTimeline().getEvents();
        const roomContext = timeline
          .filter((event) => event.getSender() && event.getContent().body)
          .map((event) => ({
            sender: event.getSender() as string,
            text: event.getContent().body as string,
            timestamp: new Date(event.getTs()).toISOString(),
            is_from_me: isFromMe(event.getSender() as string, myUserId),
          }));

        const lastNonUserMsg = [...roomContext].reverse().find((msg) => !msg.is_from_me);
        const message = lastNonUserMsg ? lastNonUserMsg.text : 'Nói gì cũng được';

        console.log('Calling generateResponseFromMessage API...');
        const response = await generateResponseFromMessage({ message, context: roomContext, spec });
        console.log('API response:', response);
        setGeneratedResponse(response);
        handleUseSuggestion(response);
      } catch (error) {
        console.error('Error in regenerateResponse:', error);
        setGeneratedResponse('Xin lỗi, đã có lỗi');
      } finally {
        setIsGeneratingResponse(false);
      }
    },
    [room, mx, myUserId, handleUseSuggestion]
  );

  const handleSend = useCallback(async () => {
    if (inputValue.trim() === '' || !mx || !myUserId) return;

    const newUserMessage: ChatMessage = {
      sender: 'user',
      text: inputValue,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, newUserMessage]);
    const question = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Get the actual room conversation from timeline
      const timeline = room.getLiveTimeline().getEvents();
      const roomContext = timeline
        .filter((event) => event.getSender() && event.getContent().body)
        .map((event) => ({
          sender: event.getSender() as string,
          text: event.getContent().body as string,
          timestamp: new Date(event.getTs()).toISOString(),
          is_from_me: isFromMe(event.getSender() as string, myUserId),
        }));

      const lastNonUserMsg = [...roomContext].reverse().find((msg) => !msg.is_from_me);
      const msgToGetResponse = lastNonUserMsg || {
        sender: 'system',
        text: 'Nói gì cũng được',
        timestamp: new Date().toISOString(),
        is_from_me: false,
      };

      const response = await getOpenAIConsultation({
        context: roomContext,
        selectedMessage: msgToGetResponse,
        question,
      });

      const aiResponse: ChatMessage = {
        sender: 'ai',
        text: response,
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.info('Error in handleSend:', error);
      const errorResponse: ChatMessage = {
        sender: 'ai',
        text: 'Sorry, there was an error processing your request.',
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, room, mx, myUserId]);

  const clearChatHistory = () => {
    setChatHistory([]);
  };

  const gradeEditorText = useCallback(
    async (text: string) => {
      if (text.trim().length > 0 && mx && myUserId) {
        const timeline = room.getLiveTimeline().getEvents();
        const roomContext = timeline
          .filter((event) => event.getSender() && event.getContent().body)
          .map((event) => ({
            sender: event.getSender() as string,
            text: event.getContent().body as string,
            timestamp: new Date(event.getTs()).toISOString(),
            is_from_me: isFromMe(event.getSender() as string, myUserId),
          }));

        const score = await gradeMessage({ message: text, context: roomContext });
        // Simple grade mapping
        const getReactionGrade = (newScore: number) => {
          if (newScore >= 80) return { emoji: '😊', grade: 'Excellent' };
          if (newScore >= 60) return { emoji: '👍', grade: 'Good' };
          if (newScore >= 40) return { emoji: '😐', grade: 'Average' };
          return { emoji: '😕', grade: 'Needs Improvement' };
        };
        const analysis = getReactionGrade(score);
        setPrediction({ ...analysis, score });
      } else {
        setPrediction(null);
      }
    },
    [room, mx, myUserId]
  );

  const value: AIAssistantContextType = useMemo(
    () => ({
      inputValue,
      chatHistory,
      isLoading,
      generatedResponse,
      isGeneratingResponse,
      isMobile,
      isAIAssistantOpen,
      prediction,

      setInputValue,
      handleSend,
      generateInitialResponse,
      regenerateResponse,
      handleUseSuggestion,
      clearChatHistory,
      toggleAIAssistant,
      gradeEditorText,
    }),
    [
      inputValue,
      chatHistory,
      isLoading,
      generatedResponse,
      isGeneratingResponse,
      isMobile,
      isAIAssistantOpen,
      prediction,
      handleSend,
      generateInitialResponse,
      regenerateResponse,
      handleUseSuggestion,
      toggleAIAssistant,
      gradeEditorText,
    ]
  );

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
}


