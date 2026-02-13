import React, { useState } from 'react';
import Scanner from './components/Scanner';
import ResultsViewer from './components/ResultsViewer';
import { analyzeDocumentStream } from './services/geminiService';
import { ProcessedDocument, ExtractedGraphic, PageAsset } from './types';
import { parseMarkdownSections, cropImageFromCoordinates } from './utils';

function App() {
  const [activeDoc, setActiveDoc] = useState<ProcessedDocument | null>(null);
  const [history, setHistory] = useState<ProcessedDocument[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const handleScanStart = () => {
    const tempDoc: ProcessedDocument = {
      id: 'pending', 
      timestamp: Date.now(),
      status: 'processing',
      summary: '',
      detailedContent: '',
      pages: [],
    };
    setActiveDoc(tempDoc);
  };

  const handleScanComplete = async (pages: PageAsset[], fileName?: string) => {
    const docId = Date.now().toString();
    const newDoc: ProcessedDocument = {
      id: docId,
      timestamp: Date.now(),
      status: 'processing',
      summary: '',
      detailedContent: '',
      pages: pages, 
      fileName: fileName || `Scan ${new Date().toLocaleTimeString()}`
    };

    setActiveDoc(newDoc);

    try {
      const stream = analyzeDocumentStream(pages);
      let accumulatedText = "";

      for await (const chunk of stream) {
        accumulatedText += chunk;
        setActiveDoc(prev => {
          if (prev?.id !== docId) return prev;
          return { ...prev, detailedContent: accumulatedText };
        });
      }

      // Post-Processing
      const parsed = parseMarkdownSections(accumulatedText);
      const categories = parsed.category.split(',').map(c => c.trim()).filter(Boolean);
      
      // Parse Graphics JSON
      let detectedGraphics: any[] = [];
      try {
        detectedGraphics = JSON.parse(parsed.graphicsJson);
      } catch (e) {
        console.warn("Failed to parse graphics JSON", e);
      }

      // Crop Images if graphics detected
      const potentialGraphics: ExtractedGraphic[] = [];
      if (detectedGraphics.length > 0) {
        showNotification(`Detected ${detectedGraphics.length} graphics. Processing...`);
        
        await Promise.all(detectedGraphics.map(async (g: any, idx: number) => {
          if (g.box_2d && Array.isArray(g.box_2d)) {
             try {
               // Determine which page to crop from
               const pageIndex = typeof g.page_index === 'number' ? g.page_index : 0;
               const sourcePage = pages[pageIndex] || pages[0]; 
               
               if (!sourcePage) return;
               
               // SKIP cropping if it is a PDF
               if (sourcePage.mimeType === 'application/pdf') {
                  // We can't crop PDFs client-side easily without a library. 
                  // We just ignore the visual graphic extraction but keep the text analysis.
                  return;
               }

               const croppedBase64 = await cropImageFromCoordinates(sourcePage.data, g.box_2d, sourcePage.mimeType);
               if (croppedBase64) {
                 potentialGraphics.push({
                   id: `graphic-${idx}`,
                   base64: croppedBase64,
                   label: g.label || `Graphic ${idx + 1}`,
                   box: g.box_2d,
                   pageIndex: pageIndex,
                   selected: true 
                 });
               }
             } catch (err) {
               console.error("Failed to crop graphic", err);
             }
          }
        }));
      }
      
      const needsReview = categories.length > 1 || potentialGraphics.length > 0;

      if (needsReview) {
        setActiveDoc(prev => {
          if (prev?.id !== docId) return prev;
          return {
            ...prev,
            status: 'reviewing',
            category: categories[0] || 'General', 
            detectedTitle: parsed.title,
            summary: parsed.summary,
            detailedContent: parsed.content,
            reviewData: {
              detectedCategories: categories,
              potentialGraphics: potentialGraphics
            }
          };
        });
        showNotification("Review required: Confirm details.");
      } else {
        finishDocument(docId, parsed.category, parsed.title, parsed.content, parsed.summary, []);
      }

    } catch (error: any) {
      console.error(error);
      setActiveDoc(prev => {
        if (prev?.id !== docId) return prev;
        return { ...prev, status: 'error', error: error.message || "Failed to analyze document." };
      });
    }
  };

  const finishDocument = (
    docId: string, 
    finalCategory: string, 
    title: string, 
    content: string, 
    summary: string, 
    graphics: ExtractedGraphic[]
  ) => {
    setActiveDoc(prev => {
      if (prev?.id !== docId) return prev;

      const completedDoc: ProcessedDocument = {
        ...prev,
        status: 'completed',
        category: finalCategory,
        detectedTitle: title,
        summary: summary,
        detailedContent: content,
        graphics: graphics
      };

      setHistory(old => [completedDoc, ...old]);
      return completedDoc;
    });
    
    showNotification("Analysis Complete.");
  };

  const handleReviewDecision = (selectedCategory: string, selectedGraphics: ExtractedGraphic[]) => {
    if (!activeDoc || activeDoc.status !== 'reviewing') return;
    finishDocument(
      activeDoc.id, 
      selectedCategory, 
      activeDoc.detectedTitle || "Document", 
      activeDoc.detailedContent, 
      activeDoc.summary,
      selectedGraphics
    );
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
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-teal-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            MediScan Pro
          </h1>
          <p className="text-xs text-slate-500 mt-1">Version 6.0.0</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">History</div>
          {history.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${activeDoc?.id === doc.id ? 'bg-teal-50 text-teal-900 border border-teal-100' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <div className="font-medium truncate">{doc.detectedTitle || doc.fileName}</div>
              <div className="text-xs text-slate-400 mt-1 flex justify-between">
                <span>{doc.category || 'General'}</span>
                <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
          {history.length === 0 && (
            <div className="text-center p-4 text-slate-400 text-xs italic">
              No scans yet.
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 flex flex-col min-h-screen relative">
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
    </div>
  );
}

export default App;