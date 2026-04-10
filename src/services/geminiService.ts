import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';
console.log("[GeminiService] Frontend API Key check:", {
  hasKey: !!apiKey,
  keyLength: apiKey.length,
  keyPrefix: apiKey.substring(0, 4)
});
const ai = new GoogleGenAI({ apiKey });

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Gemini API error, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

export const geminiService = {
  async chat(messages: { role: 'user' | 'model', parts: { text: string }[] }[], systemInstruction?: string) {
    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          systemInstruction,
        }
      });
      return response.text;
    });
  },

  async chatStream(messages: any[], systemInstruction?: string) {
    return withRetry(async () => {
      return ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction,
        }
      });
    });
  },

  async analyzeFile(file: File, prompt: string) {
    // Convert file to base64
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      return response.text;
    });
  },

  async analyzeMultipleFilesStream(files: { data: string, mimeType: string }[], prompt: string, systemInstruction?: string, useSearch = false) {
    console.log(`[GeminiService] Analyzing ${files.length} files. Search enabled: ${useSearch}`);
    const parts: any[] = [{ text: prompt }];
    
    files.forEach((f, i) => {
      console.log(`[GeminiService] File ${i+1}: ${f.mimeType}, size: ${f.data.length} chars`);
      parts.push({
        inlineData: {
          mimeType: f.mimeType,
          data: f.data
        }
      });
    });

    return withRetry(async () => {
      console.log('[GeminiService] Calling generateContentStream...');
      return ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts
          }
        ],
        config: {
          systemInstruction,
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
        }
      });
    });
  },

  async analyzeLargeFilesStream(files: File[], prompt: string, systemInstruction: string, language: string, link?: string, useSearch?: boolean) {
    console.log(`[GeminiService] Analyzing ${files.length} files. Link: ${link}, Search: ${useSearch}`);
    
    const parts: any[] = [{ text: prompt }];
    
    if (link) {
      parts[0].text += `\n\nLink to analyze: ${link}`;
    }

    // Read files as base64
    const filePromises = files.map(async (file) => {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      };
    });

    const fileParts = await Promise.all(filePromises);
    parts.push(...fileParts);

    return withRetry(async () => {
      console.log('[GeminiService] Calling generateContentStream...');
      return ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: systemInstruction + ` Respond in ${language}.`,
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
        }
      });
    });
  }
};
