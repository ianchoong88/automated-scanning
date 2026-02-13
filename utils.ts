export const parseMarkdownSections = (text: string) => {
  const result = {
    title: '',
    category: '',
    summary: '',
    content: '',
    graphicsJson: '[]'
  };

  // Helper to extract text between headers
  const extract = (headerName: string, nextHeaderNames: string[]): string => {
    // Robust regex to match markdown headers:
    // 1. Start of line or string ((?:^|\n))
    // 2. One or more hashes (#+)
    // 3. Optional whitespace (\s*)
    // 4. The header name (case insensitive)
    // 5. Rest of the line ([^\n]*)
    // 6. Capture the content until the next known header or end of string
    
    // Construct lookahead for next headers
    const nextHeadersPattern = nextHeaderNames.length > 0 
      ? `(?=(?:^|\\n)#+\\s*(?:${nextHeaderNames.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`
      : '(?=$)';

    const pattern = `(?:^|\\n)#+\\s*${headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\s*([\\s\\S]*?)${nextHeadersPattern}`;
    
    try {
      const headerRegex = new RegExp(pattern, 'i');
      const match = text.match(headerRegex);
      return match ? match[1].trim() : '';
    } catch (e) {
      console.warn(`Regex error for header ${headerName}`, e);
      return '';
    }
  };

  result.title = extract('Document Title', ['Category', 'Executive Summary', 'Extracted Content', 'Detected Graphics']);
  result.category = extract('Category', ['Executive Summary', 'Extracted Content', 'Detected Graphics']);
  result.summary = extract('Executive Summary', ['Extracted Content', 'Detected Graphics']);
  result.content = extract('Extracted Content', ['Detected Graphics']);
  
  // Extract Graphics JSON specifically
  // Sometimes the model might output ```json ``` blocks, strip them
  let rawJson = extract('Detected Graphics', []); // Empty next headers means go to end
  
  // Clean up potential markdown code blocks
  rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Try to find the array bracket start and end to be safe
  const arrayStart = rawJson.indexOf('[');
  const arrayEnd = rawJson.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1) {
    result.graphicsJson = rawJson.substring(arrayStart, arrayEnd + 1);
  }

  // Fallback if title is empty
  if (!result.title) result.title = "Untitled Medical Document";

  return result;
};

export const cropImageFromCoordinates = async (base64Image: string, box: number[], mimeType: string = 'image/jpeg'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Box is [ymin, xmin, ymax, xmax] in 0-1000 scale
      // Ensure box has 4 numbers
      if (!Array.isArray(box) || box.length !== 4) {
        console.warn("Invalid box coordinates", box);
        resolve('');
        return;
      }

      const [ymin, xmin, ymax, xmax] = box;
      
      const width = img.width;
      const height = img.height;
      
      const x = (xmin / 1000) * width;
      const y = (ymin / 1000) * height;
      const w = ((xmax - xmin) / 1000) * width;
      const h = ((ymax - ymin) / 1000) * height;
      
      // Safety bounds
      const safeX = Math.max(0, x);
      const safeY = Math.max(0, y);
      const safeW = Math.min(width - safeX, w);
      const safeH = Math.min(height - safeY, h);

      if (safeW <= 0 || safeH <= 0) {
        console.warn("Invalid crop dimensions", { safeW, safeH });
        resolve(''); // Invalid crop
        return;
      }

      canvas.width = safeW;
      canvas.height = safeH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('No context'); return; }
      
      ctx.drawImage(img, safeX, safeY, safeW, safeH, 0, 0, safeW, safeH);
      // Returns full data url "data:image/jpeg;base64,..."
      const dataUrl = canvas.toDataURL(mimeType); 
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = (e) => {
      console.error("Image load failed", e);
      reject(e);
    };
    // Ensure we have the prefix for the source
    img.src = base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${base64Image}`;
  });
};