import { API_ENDPOINTS } from '../constants/env';

export type Message = {
  sender: string;
  text: string;
  timestamp: string;
  is_from_me: boolean;
};

export async function getOpenAIConsultation({
  context,
  selectedMessage,
  question,
}: {
  context: Message[];
  selectedMessage: Message;
  question?: string;
}): Promise<string> {
  try {
    const response = await fetch(API_ENDPOINTS.AI.SUGGESTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context,
        selectedMessage,
        question,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch suggestion from server.');
    }

    const data = await response.json();
    return data.suggestion;
  } catch (error) {
    console.error('Error in getOpenAIConsultation:', error);
    return 'Sorry, there was an error fetching the suggestion.';
  }
}

export async function generateResponseFromMessage({
  message,
  context,
  spec,
}: {
  message: string;
  context: Message[];
  spec: object;
}): Promise<string> {
  try {
    console.log('generateResponseFromMessage called with:', { message, context, spec });

    const response = await fetch(API_ENDPOINTS.AI.GENERATE_RESPONSE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        spec,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate response from server.');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error in generateResponseFromMessage:', error);
    return 'Xin lỗi, đã có lỗi khi tạo phản hồi.';
  }
}

export async function gradeMessage({
  message,
  context,
}: {
  message: string;
  context: Message[];
}): Promise<number> {
  try {
    const response = await fetch(API_ENDPOINTS.AI.GRADE_RESPONSE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response: message,
        context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to grade message from server.');
    }

    const data = await response.json();
    return data.score || 0;
  } catch (error) {
    console.error('Error in gradeMessage:', error);
    return 0;
  }
}


