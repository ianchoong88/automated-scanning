import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { PageAsset } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function* analyzeDocumentStream(
  pages: PageAsset[]
): AsyncGenerator<string, void, unknown> {
  const ai = getClient();
  
  // Construct parts for all pages
  const contentParts: any[] = pages.map(page => ({
    inlineData: {
      mimeType: page.mimeType,
      data: page.data,
    },
  }));

  // Append the prompt
  contentParts.push({
    text: `Analyze this medical document which may consist of multiple pages (images or PDFs). Output a single cohesive Markdown formatted response.
          
          Structure your response exactly with these headers:

          # Document Title
          [Extract the main title.]

          # Category
          [Medical Field Name.]

          # Executive Summary
          [Brief summary of the entire document.]
          
          # Extracted Content
          [Full text extraction. Format with headers (#, ##) and bullet points. If there are multiple pages, merge them into a logical flow.]

          # Detected Graphics
          [
             Identify any **charts, data tables, graphs, or scientific diagrams** that contain data across ALL pages.
             
             Output ONLY a JSON array in this section. No text, no markdown code fences around the JSON.
             
             JSON Format:
             [
               {
                 "box_2d": [ymin, xmin, ymax, xmax], 
                 "label": "Brief description of the graphic",
                 "page_index": 0 
               }
             ]
             
             * "page_index": The 0-based index of the page item (in the order provided) where this graphic appears.
             * "box_2d": Coordinates must be integers 0-1000.
             * If no relevant graphics are found, output: []
          ]
          
          IMPORTANT: 
          - Do NOT describe the graphics in the 'Extracted Content' section.
          - Do NOT include social media icons or QR codes in the graphics list.`,
  });
  
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: contentParts,
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