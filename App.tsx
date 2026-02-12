import React, { useState, useEffect } from 'react';
import Scanner from './components/Scanner';
import ResultsViewer from './components/ResultsViewer';
import MasterDocModal from './components/MasterDocModal';
import { analyzeDocumentStream } from './services/geminiService';
import { ProcessedDocument } from './types';
import { parseMarkdownSections } from './utils';

function App() {
  const [activeDoc, setActiveDoc] = useState<ProcessedDocument | null>(null);
  const [history, setHistory] = useState<ProcessedDocument[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Master Doc State
  const [masterDocContent, setMasterDocContent] = useState<string>("");
  const [isMasterDocOpen, setIsMasterDocOpen] = useState(false);

  // Load Master Doc from local storage on mount
  useEffect(() => {
    const savedDoc = localStorage.getItem('mediScan_masterDoc');
    if (savedDoc) setMasterDocContent(savedDoc);
  }, []);

  const updateMasterDoc = (newContent: string) => {
    const updated = masterDocContent + "\n\n---\n\n" + newContent;
    setMasterDocContent(updated);
    localStorage.setItem('mediScan_masterDoc', updated);
  };

  const handleScanStart = () => {
    const tempDoc: ProcessedDocument = {
      id: 'pending', 
      timestamp: Date.now(),
      status: 'processing',
      summary: '',
      detailedContent: '',
      graphicsDescription: '',
    };
    setActiveDoc(tempDoc);
  };

  const handleScanComplete = async (base64: string, mimeType: string, fileName?: string) => {
    const docId = Date.now().toString();
    const newDoc: ProcessedDocument = {
      id: docId,
      timestamp: Date.now(),
      status: 'processing',
      summary: '',
      detailedContent: '',
      graphicsDescription: '',
      fileName: fileName || `Scan ${new Date().toLocaleTimeString()}`
    };

    setActiveDoc(newDoc);

    try {
      const stream = analyzeDocumentStream(base64, mimeType);
      let accumulatedText = "";

      for await (const chunk of stream) {
        accumulatedText += chunk;
        setActiveDoc(prev => {
          if (prev?.id !== docId) return prev;
          return { ...prev, detailedContent: accumulatedText };
        });
      }

      // Post-Processing: Parse sections for review
      const parsed = parseMarkdownSections(accumulatedText);
      
      const categories = parsed.category.split(',').map(c => c.trim()).filter(Boolean);
      const hasGraphics = parsed.graphics.length > 5 && !parsed.graphics.toLowerCase().includes('none');

      // If we need review (multiple categories OR graphics detected), pause state
      if (categories.length > 1 || hasGraphics) {
        setActiveDoc(prev => {
          if (prev?.id !== docId) return prev;
          return {
            ...prev,
            status: 'reviewing',
            category: categories[0], // Default to first
            summary: parsed.summary,
            graphicsDescription: parsed.graphics,
            reviewData: {
              detectedCategories: categories,
              detectedGraphics: parsed.graphics,
              hasGraphics
            }
          };
        });
        showNotification("Review required: Please confirm details.");
      } else {
        // Auto-complete
        finishDocument(docId, parsed.category, parsed.graphics, accumulatedText);
      }

    } catch (error: any) {
      console.error(error);
      setActiveDoc(prev => {
        if (prev?.id !== docId) return prev;
        return { ...prev, status: 'error', error: error.message || "Failed to analyze document." };
      });
    }
  };

  const finishDocument = (docId: string, finalCategory: string, finalGraphics: string, fullText: string) => {
    setActiveDoc(prev => {
      if (prev?.id !== docId) return prev;

      // Construct final report text
      const finalReport = `
# Category: ${finalCategory}
${fullText.replace(/# Category[\s\S]*?(?=# Executive Summary)/, '')}
      `.trim();

      // If user kept graphics, ensure they are in the text. If rejected (passed as empty string), remove section.
      let cleanedText = finalReport;
      if (!finalGraphics) {
        // Remove Graphics section via regex if it exists
        cleanedText = cleanedText.replace(/# Graphics & Data[\s\S]*?(?=# Extracted Content)/, '');
      }

      const completedDoc: ProcessedDocument = {
        ...prev,
        status: 'completed',
        category: finalCategory,
        detailedContent: cleanedText
      };

      setHistory(old => [completedDoc, ...old]);
      updateMasterDoc(cleanedText);
      return completedDoc;
    });
    
    showNotification("Synced to Master Google Doc.");
  };

  const handleReviewDecision = (keepGraphics: boolean, selectedCategory: string) => {
    if (!activeDoc || activeDoc.status !== 'reviewing') return;
    
    // If keepGraphics is false, we pass empty string for graphics to signal removal
    const graphicsToKeep = keepGraphics ? activeDoc.reviewData?.detectedGraphics || "" : "";
    
    finishDocument(activeDoc.id, selectedCategory, graphicsToKeep, activeDoc.detailedContent);
  };

  const handleScanError = (msg: string) => {
    setActiveDoc(null);
    showNotification(msg);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar History */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-teal-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            MediScan Pro
          </h1>
          <p className="text-xs text-slate-500 mt-1">Version 3.2.0</p>
        </div>
        
        {/* Master Doc Link */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <button 
            onClick={() => setIsMasterDocOpen(true)}
            className="flex items-center gap-3 w-full text-left text-blue-700 hover:text-blue-800 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">Master Google Doc</div>
              <div className="text-xs opacity-70">View aggregated report</div>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent Scans</div>
          {history.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${activeDoc?.id === doc.id ? 'bg-teal-50 text-teal-900 border border-teal-100' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <div className="font-medium truncate">{doc.fileName || `Scan ${new Date(doc.timestamp).toLocaleTimeString()}`}</div>
              <div className="text-xs text-slate-400 mt-1 flex justify-between">
                <span>{doc.category || 'General'}</span>
                <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative">
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in-down flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {notification}
          </div>
        )}

        <div className="max-w-4xl w-full mx-auto p-4 md:p-8 space-y-8">
          <section>
             <h2 className="text-lg font-semibold text-slate-700 mb-4">New Scan</h2>
             <Scanner 
               onScanStart={handleScanStart}
               onScanComplete={handleScanComplete}
               onScanError={handleScanError}
             />
          </section>

          {activeDoc && (
             <section className="animate-fade-in pb-20">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-700">Results</h2>
                  <span className="text-xs text-slate-400 font-mono">ID: {activeDoc.id === 'pending' ? '...' : activeDoc.id}</span>
               </div>
               <ResultsViewer 
                 document={activeDoc}
                 onReviewDecision={handleReviewDecision}
               />
             </section>
          )}
        </div>
      </main>

      {/* Master Doc Modal */}
      {isMasterDocOpen && (
        <MasterDocModal 
          content={masterDocContent} 
          onClose={() => setIsMasterDocOpen(false)} 
        />
      )}
    </div>
  );
}

export default App;