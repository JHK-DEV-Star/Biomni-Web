import axios from 'axios';
import { LogStep } from './types';

// 백엔드 주소 (로컬)
const API_BASE_URL = 'http://34.50.10.138:8000/api';
//const API_BASE_URL = 'http://localhost:8000/api';

interface ChatResponse {
  response: string;
  logs: LogStep[];
}

export const sendMessage = async (message: string): Promise<ChatResponse> => {
  const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat`, { message });
  return response.data;
};

export const sendChatMessageStream = async (
  message: string,
  sessionId: string,
  onChunk: (data: any) => void
) => {
  const response = await fetch("http://localhost:8000/api/chat_stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!response.body) throw new Error("No response body returned from server");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    // 수신된 바이트 데이터를 문자열로 디코딩
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    
    // 마지막 줄이 불완전하게 잘렸을 경우를 대비해 버퍼에 남김
    buffer = lines.pop() || ""; 

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.replace("data: ", "");
        try {
          const data = JSON.parse(dataStr);
          onChunk(data); // App.tsx 로 데이터 전달
        } catch (e) {
          console.error("JSON Parsing Error during stream:", e);
        }
      }
    }
  }
};