export const parseMarkdownSections = (text: string) => {
  const result = {
    category: '',
    summary: '',
    graphics: '',
    content: ''
  };

  // Helper to extract text between headers
  const extract = (headerName: string, nextHeaderNames: string[]): string => {
    const headerRegex = new RegExp(`# ${headerName}\\s*([\\s\\S]*?)(${nextHeaderNames.map(h => `# ${h}`).join('|')}|$)`, 'i');
    const match = text.match(headerRegex);
    return match ? match[1].trim() : '';
  };

  result.category = extract('Category', ['Executive Summary', 'Graphics & Data', 'Extracted Content']);
  result.summary = extract('Executive Summary', ['Graphics & Data', 'Extracted Content']);
  result.graphics = extract('Graphics & Data', ['Extracted Content']);
  
  // Content is usually last
  const contentMatch = text.match(/# Extracted Content\s*([\s\S]*)/i);
  result.content = contentMatch ? contentMatch[1].trim() : '';

  return result;
};