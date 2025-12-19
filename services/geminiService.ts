
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeminiResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
당신은 '네오 서울: 기억의 파편'이라는 사이버펑크 하이퍼 리얼리스틱 TRPG의 마스터입니다.
2088년의 서울을 배경으로 하며, 분위기는 어둡고 미스테리하며 긴장감이 넘칩니다.
사용자의 선택에 따라 논리적이고 흥미진진한 전개를 만드세요.

응답은 반드시 JSON 형식이어야 합니다.
- description: 현재 상황에 대한 생생하고 감각적인 묘사 (한국어)
- imagePrompt: 이 장면을 설명하는 영문 이미지 생성 프롬프트. 'Highly detailed cyberpunk, neon lights, cinematic lighting, 8k' 스타일 포함.
- choices: 사용자가 선택할 수 있는 2~3개의 행동 (한국어)
- isEnding: 이야기의 결말 여부 (boolean)
- statusUpdate: 체력(healthChange), 정신력(mentalChange) 변화량 및 획득 아이템(foundItem).
`;

export const generateScene = async (
  prompt: string,
  history: any[]
): Promise<GeminiResponse> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { role: 'user', parts: [{ text: `이전 대화 맥락: ${JSON.stringify(history)} \n\n 사용자 행동: ${prompt}` }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          imagePrompt: { type: Type.STRING },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                action: { type: Type.STRING }
              },
              required: ["text", "action"]
            }
          },
          isEnding: { type: Type.BOOLEAN },
          statusUpdate: {
            type: Type.OBJECT,
            properties: {
              healthChange: { type: Type.INTEGER },
              mentalChange: { type: Type.INTEGER },
              foundItem: { type: Type.STRING }
            },
            required: ["healthChange", "mentalChange"]
          }
        },
        required: ["description", "imagePrompt", "choices", "isEnding", "statusUpdate"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("JSON Parsing error:", e);
    throw new Error("Invalid response from AI");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  return "https://picsum.photos/1280/720";
};
