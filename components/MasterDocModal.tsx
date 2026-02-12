import React from 'react';

interface MasterDocModalProps {
  content: string;
  onClose: () => void;
}

const MasterDocModal: React.FC<MasterDocModalProps> = ({ content, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
              <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold">Master Medical Record</h2>
              <p className="text-blue-100 text-xs">Simulated Google Doc · Auto-Saved</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-white">
          <div className="max-w-3xl mx-auto shadow-sm border border-slate-200 min-h-[800px] p-12 bg-white relative">
             {/* Doc Header imitation */}
             <div className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold text-slate-800">Medical Document Scans</h1>
                <p className="text-slate-500 mt-2">Aggregated report of all scans.</p>
             </div>

             {/* Dynamic Content */}
             <div className="prose prose-slate max-w-none font-serif whitespace-pre-wrap">
               {content ? content : <span className="text-slate-400 italic">No documents scanned yet.</span>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDocModal;