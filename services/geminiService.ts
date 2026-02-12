import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

// We now yield chunks of text instead of returning a single object
export async function* analyzeDocumentStream(
  base64Data: string, 
  mimeType: string = 'image/jpeg'
): AsyncGenerator<string, void, unknown> {
  const ai = getClient();
  
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `Analyze this medical document. Output a single Markdown formatted response.
          
          Structure your response exactly with these headers:

          # Category
          [Medical Field Name. If ambiguous, list max 3 alternatives separated by commas, e.g. "Neurology, Orthopedics"]

          # Executive Summary
          [Brief summary here]
          
          # Graphics & Data
          [Description of charts, graphs, tables, or visual data here. If NO graphics/data are present, write "None".]
          
          # Extracted Content
          [Full text extraction here]

          Ignore QR codes and social media logos. Do not wrap the output in markdown code blocks.`,
        },
      ],
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 }, 
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}