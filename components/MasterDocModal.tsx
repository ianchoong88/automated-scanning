import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';
import { ProcessedDocument } from '../types';

interface MasterDocModalProps {
  history: ProcessedDocument[];
  onClose: () => void;
}

const MasterDocModal: React.FC<MasterDocModalProps> = ({ history, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDocx = async () => {
    setIsGenerating(true);
    try {
      const docChildren = [
        new Paragraph({
          text: "Master Medical Record",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: `Generated on ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        })
      ];

      // Reverse history to show oldest first for the doc logic? Or newest first?
      // Usually a master record appends new stuff. We will append new stuff to bottom.
      // History is typically stored Newest First in App state. Let's reverse for the Doc to be Chronological.
      const chronologicalHistory = [...history].reverse();

      chronologicalHistory.forEach((doc, index) => {
        // Document Separator
        if (index > 0) {
          docChildren.push(
            new Paragraph({
              text: "--------------------------------------------------------------------------------",
              spacing: { before: 400, after: 400 },
              alignment: AlignmentType.CENTER,
              style: "disabled"
            })
          );
        }

        // Header: Category & Date
        docChildren.push(
          new Paragraph({
            text: `${doc.category || 'Uncategorized'} - ${doc.fileName || 'Scan'}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: `Date: ${new Date(doc.timestamp).toLocaleString()}`,
            style: "Subtitle",
            spacing: { after: 300 }
          })
        );

        // Parse the markdown content roughly to paragraphs
        // We will just split by double newline to form paragraphs
        const paragraphs = doc.detailedContent.split(/\n\n+/);
        
        paragraphs.forEach(para => {
          // Check for headers in markdown
          if (para.startsWith('# ')) {
             docChildren.push(new Paragraph({ 
               text: para.replace(/#+\s/, ''), 
               heading: HeadingLevel.HEADING_3,
               spacing: { before: 200, after: 100 } 
             }));
          } else {
             docChildren.push(new Paragraph({ 
               text: para.replace(/\*\*/g, ''), // Basic cleanup of bold markers
               spacing: { after: 120 } 
             }));
          }
        });
      });

      if (history.length === 0) {
         docChildren.push(new Paragraph({ text: "No scans recorded yet.", style: "italic" }));
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Master_Medical_Record.docx");
      
    } catch (e) {
      console.error(e);
      alert("Failed to generate DOCX.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
               <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
               <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold">Master Record Export</h2>
              <p className="text-blue-100 text-xs">Convert your history to a real Word file</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 bg-white text-center space-y-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-blue-900 text-lg mb-2">Ready to Generate</h3>
            <p className="text-blue-700 text-sm">
              This will compile {history.length} scanned documents into a single 
              <span className="font-bold"> .docx</span> file.
            </p>
            <p className="text-blue-700 text-sm mt-2">
              You can upload this file directly to 
              <span className="font-bold"> Google Drive </span> 
              to edit it as a Google Doc.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <button 
               onClick={generateDocx}
               disabled={isGenerating}
               className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {isGenerating ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   Generating...
                 </>
               ) : (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                   </svg>
                   Download .docx
                 </>
               )}
             </button>
             
             <div className="text-xs text-slate-400 mt-2">
               Note: The generated file is compatible with Microsoft Word and Google Docs.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDocModal;