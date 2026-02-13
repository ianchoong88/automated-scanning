import React, { useEffect, useRef, useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import saveAs from 'file-saver';
import { ProcessedDocument, ExtractedGraphic } from '../types';

interface ResultsViewerProps {
  document: ProcessedDocument;
  onReviewDecision: (category: string, graphics: ExtractedGraphic[]) => void;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ document, onReviewDecision }) => {
  const { 
    detailedContent, 
    status,
    reviewData,
    category,
    detectedTitle,
    summary,
    pages,
    graphics
  } = document;
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [reviewGraphics, setReviewGraphics] = useState<ExtractedGraphic[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (reviewData?.detectedCategories?.[0]) {
      setSelectedCategory(reviewData.detectedCategories[0]);
    }
    if (reviewData?.potentialGraphics) {
      setReviewGraphics(reviewData.potentialGraphics);
    }
  }, [reviewData]);

  // Auto-scroll
  useEffect(() => {
    if (status === 'processing' && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [detailedContent, status]);

  const toggleGraphicSelection = (id: string) => {
    setReviewGraphics(prev => prev.map(g => 
      g.id === id ? { ...g, selected: !g.selected } : g
    ));
  };

  const generateDocx = async () => {
    if (!detectedTitle) return;
    setIsGenerating(true);

    try {
      const docChildren: any[] = [
        new Paragraph({
          text: detectedTitle,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: `Category: ${category || 'Uncategorized'}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Executive Summary",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: summary,
          spacing: { after: 300 }
        }),
      ];

      // Insert Selected Graphics
      const validGraphics = graphics?.filter(g => g.selected) || [];
      if (validGraphics.length > 0) {
        docChildren.push(
          new Paragraph({
            text: "Key Figures & Data",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        );

        for (const g of validGraphics) {
          const imageBinaryString = window.atob(g.base64);
          const imageBytes = new Uint8Array(imageBinaryString.length);
          for (let i = 0; i < imageBinaryString.length; i++) {
            imageBytes[i] = imageBinaryString.charCodeAt(i);
          }

          docChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  transformation: {
                    width: 450, 
                    height: 450 * (imageBytes.length > 0 ? 0.75 : 1), 
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 100 }
            }),
            new Paragraph({
              text: g.label,
              style: "Caption",
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 }
            })
          );
        }
      }

      // Append Original Scans as Reference
      docChildren.push(
        new Paragraph({
          text: "Appendix: Original Scans",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 100 }
        })
      );

      for (let i = 0; i < pages.length; i++) {
         const page = pages[i];
         docChildren.push(
          new Paragraph({
            text: `Item ${i + 1} (${page.mimeType === 'application/pdf' ? 'PDF' : 'Image'})`,
            heading: HeadingLevel.HEADING_4,
            spacing: { before: 200, after: 100 }
          })
         );
         
         if (page.mimeType.startsWith('image/')) {
           const imageBinaryString = window.atob(page.data);
           const imageBytes = new Uint8Array(imageBinaryString.length);
           for (let k = 0; k < imageBinaryString.length; k++) {
             imageBytes[k] = imageBinaryString.charCodeAt(k);
           }
           
           docChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  transformation: { width: 500, height: 600 }, 
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 }
            })
          );
         } else {
           docChildren.push(
             new Paragraph({
               text: "[PDF Document content attached separately or not displayable in this view]",
               style: "italic",
               alignment: AlignmentType.CENTER,
               spacing: { after: 300 }
             })
           );
         }
      }

      docChildren.push(
        new Paragraph({
          text: "Detailed Content",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      // Parse detailed content paragraphs
      const paragraphs = detailedContent.split(/\n\n+/);
      paragraphs.forEach(para => {
        // Skip the detected graphics json block if it leaked into content
        if (para.includes("# Detected Graphics")) return;
        if (para.trim().startsWith('[{"box_2d"')) return;

        if (para.startsWith('# ')) {
           docChildren.push(new Paragraph({ 
             text: para.replace(/#+\s/, ''), 
             heading: HeadingLevel.HEADING_4,
             spacing: { before: 200, after: 100 } 
           }));
        } else {
           docChildren.push(new Paragraph({ 
             text: para.replace(/\*\*/g, ''), 
             spacing: { after: 120 } 
           }));
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const safeFilename = detectedTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      saveAs(blob, `${safeFilename}.docx`);

    } catch (e) {
      console.error(e);
      alert("Failed to create Word document.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (status === 'processing' && !detailedContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center animate-pulse">
        <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-semibold text-slate-800">Initializing Scan...</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Analyzing content & detecting graphics...
        </p>
      </div>
    );
  }

  if (status === 'error') {
     return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008h-.008V12.75Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-700">Scan Failed</h3>
        <p className="text-red-500 mt-2">{document.error || "An unknown error occurred."}</p>
      </div>
    );
  }

  // REVIEW UI
  if (status === 'reviewing' && reviewData) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-amber-600">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            Review Scan Details
          </h3>
          
          {reviewData.detectedCategories.length > 1 && (
            <div className="mb-6">
              <p className="text-amber-800 mb-2 font-semibold text-sm">Select Category:</p>
              <div className="flex flex-wrap gap-2">
                {reviewData.detectedCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedCategory === cat 
                      ? 'bg-amber-600 text-white border-amber-600' 
                      : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {reviewGraphics.length > 0 && (
            <div className="mb-6">
              <p className="text-amber-800 mb-2 font-semibold text-sm">Select Graphics to Include:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {reviewGraphics.map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => toggleGraphicSelection(g.id)}
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${g.selected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200 opacity-60'}`}
                  >
                    <img src={`data:image/jpeg;base64,${g.base64}`} alt={g.label} className="w-full h-32 object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate">
                      {g.label}
                    </div>
                    {g.selected && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
            
          <button 
            onClick={() => onReviewDecision(
              selectedCategory || document.category || 'General',
              reviewGraphics
            )}
            className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
          >
            Confirm & Save
          </button>
        </div>
      </div>
    );
  }

  // NORMAL VIEW
  return (
    <div className="space-y-6">
      {status === 'processing' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium animate-pulse border border-teal-100">
           <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
           Streaming analysis...
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
              {category || 'Uncategorized'}
            </span>
            <span className="font-semibold text-slate-700 text-sm truncate max-w-[200px]">
              {detectedTitle || 'Untitled'}
            </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={generateDocx}
              disabled={isGenerating || status === 'processing'}
              className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 uppercase tracking-wide disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Download DOCX'}
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(detailedContent)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 uppercase tracking-wide"
            >
              Copy Text
            </button>
          </div>
        </div>
        
        {/* Detected Graphics Gallery */}
        {graphics && graphics.some(g => g.selected) && (
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Included Graphics</h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {graphics.filter(g => g.selected).map(g => (
                <div key={g.id} className="flex-shrink-0 w-32 border border-slate-200 rounded-md bg-white p-1">
                   <img src={`data:image/jpeg;base64,${g.base64}`} alt={g.label} className="w-full h-24 object-contain" />
                   <p className="text-[10px] text-center mt-1 text-slate-600 truncate">{g.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          ref={contentRef}
          className="p-6 font-mono text-sm text-slate-600 whitespace-pre-wrap max-h-[600px] overflow-y-auto scroll-smooth"
        >
          {detailedContent}
          {status === 'processing' && <span className="inline-block w-2 h-4 bg-teal-500 ml-1 animate-pulse align-middle"></span>}
        </div>
      </div>
    </div>
  );
};

export default ResultsViewer;