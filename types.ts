export interface ProcessedDocument {
  id: string;
  timestamp: number;
  originalImage?: string; // Base64
  fileName?: string;
  
  // Content Fields
  category?: string;
  summary: string;
  detailedContent: string; // The raw full text
  graphicsDescription: string;
  
  // Status
  status: 'processing' | 'reviewing' | 'completed' | 'error';
  error?: string;

  // Review Data (temporary storage during review)
  reviewData?: {
    detectedCategories: string[];
    detectedGraphics: string;
    hasGraphics: boolean;
  };
}

export interface AnalysisResponse {
  summary: string;
  detailedContent: string;
  graphicsDescription: string;
}