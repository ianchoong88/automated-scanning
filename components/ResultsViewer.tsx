import React, { useEffect, useRef, useState } from 'react';
import { ProcessedDocument } from '../types';

interface ResultsViewerProps {
  document: ProcessedDocument;
  onReviewDecision: (keepGraphics: boolean, category: string) => void;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ document, onReviewDecision }) => {
  const { 
    detailedContent, 
    status,
    reviewData,
    category
  } = document;
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    if (reviewData?.detectedCategories?.[0]) {
      setSelectedCategory(reviewData.detectedCategories[0]);
    }
  }, [reviewData]);

  // Auto-scroll
  useEffect(() => {
    if (status === 'processing' && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [detailedContent, status]);

  if (status === 'processing' && !detailedContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center animate-pulse">
        <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-semibold text-slate-800">Initializing Scan...</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Connecting to Gemini 3 Flash...
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
          <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-amber-600">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            Action Required
          </h3>
          <p className="text-amber-800 mb-6">Please review the detected information before syncing to Google Docs.</p>

          <div className="space-y-6">
            {/* Category Selector */}
            {reviewData.detectedCategories.length > 1 && (
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">Select Category:</label>
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

            {/* Graphics Selector */}
            {reviewData.hasGraphics && (
              <div className="bg-white p-4 rounded-lg border border-amber-100">
                <label className="block text-sm font-semibold text-amber-900 mb-2">Detected Graphics & Charts:</label>
                <p className="text-sm text-slate-600 italic mb-4 p-2 bg-slate-50 rounded border border-slate-100">
                  {reviewData.detectedGraphics.length > 200 
                    ? reviewData.detectedGraphics.substring(0, 200) + '...' 
                    : reviewData.detectedGraphics}
                </p>
                <div className="flex gap-4">
                   <button 
                     onClick={() => onReviewDecision(true, selectedCategory || document.category || 'General')}
                     className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                   >
                     Keep Graphics
                   </button>
                   <button 
                     onClick={() => onReviewDecision(false, selectedCategory || document.category || 'General')}
                     className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
                   >
                     Discard Graphics
                   </button>
                </div>
              </div>
            )}
            
            {!reviewData.hasGraphics && reviewData.detectedCategories.length > 1 && (
               <button 
                 onClick={() => onReviewDecision(true, selectedCategory || document.category || 'General')}
                 className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
               >
                 Confirm Category
               </button>
            )}
          </div>
        </div>

        {/* Preview of text */}
        <div className="opacity-50 pointer-events-none p-6 font-mono text-xs border border-slate-200 rounded-lg bg-slate-50">
          {detailedContent.substring(0, 500)}...
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
            <h3 className="font-semibold text-slate-700 text-sm">Analysis Results</h3>
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText(detailedContent)}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 uppercase tracking-wide"
          >
            Copy
          </button>
        </div>
        
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