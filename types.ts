export interface PageAsset {
  data: string; // Base64
  mimeType: string;
}

export interface ExtractedGraphic {
  id: string;
  base64: string; // The cropped image
  label: string;
  box: number[]; // [ymin, xmin, ymax, xmax] 0-1000
  selected: boolean;
  pageIndex: number; // Which page this graphic belongs to (0-based)
}

export interface ProcessedDocument {
  id: string;
  timestamp: number;
  pages: PageAsset[]; // Array of assets
  fileName?: string;
  detectedTitle?: string;
  
  // Content Fields
  category?: string;
  summary: string;
  detailedContent: string; // The raw full text
  
  // Detected Graphics
  graphics?: ExtractedGraphic[];
  
  // Status
  status: 'processing' | 'reviewing' | 'completed' | 'error';
  error?: string;

  // Review Data (temporary storage during review)
  reviewData?: {
    detectedCategories: string[];
    potentialGraphics?: ExtractedGraphic[]; // Graphics waiting for approval
  };
}

export interface AnalysisResponse {
  summary: string;
  detailedContent: string;
}