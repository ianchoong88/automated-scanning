import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CAMERA_ICON, DOC_ICON } from '../constants';
import { PageAsset } from '../types';

interface ScannerProps {
  onScanStart: () => void;
  onScanComplete: (pages: PageAsset[], fileName?: string) => void;
  onScanError: (msg: string) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanStart, onScanComplete, onScanError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Staging area for multiple pages
  const [stagedPages, setStagedPages] = useState<PageAsset[]>([]);

  // Effect to attach stream to video element when both are ready
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      setIsCameraActive(false);
      onScanError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const processImage = (imageSource: CanvasImageSource, originalWidth: number, originalHeight: number): string => {
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 1024; // Resize to max 1024px width for speed
    let width = originalWidth;
    let height = originalHeight;

    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(imageSource, 0, 0, width, height);
    // Compress to 0.7 quality JPEG
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const dataUrl = processImage(video, video.videoWidth, video.videoHeight);
        const base64 = dataUrl.split(',')[1];
        
        setStagedPages(prev => [...prev, { data: base64, mimeType: 'image/jpeg' }]);
        
      } catch (e) {
        onScanError("Failed to capture image.");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      
      if (file.type.startsWith('image/')) {
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            try {
              const dataUrl = processImage(img, img.width, img.height);
              const base64 = dataUrl.split(',')[1];
              setStagedPages(prev => [...prev, { data: base64, mimeType: 'image/jpeg' }]);
            } catch (e) {
              console.error(e);
            }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        reader.onload = () => {
          const result = reader.result as string;
          // FileReader readAsDataURL returns "data:application/pdf;base64,....."
          const base64 = result.split(',')[1];
          setStagedPages(prev => [...prev, { data: base64, mimeType: 'application/pdf' }]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePage = (index: number) => {
    setStagedPages(prev => prev.filter((_, i) => i !== index));
  };

  const finishScanning = () => {
    if (stagedPages.length === 0) return;
    onScanStart();
    onScanComplete(stagedPages, `Scan ${new Date().toLocaleTimeString()}`);
    stopCamera();
    setStagedPages([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Viewport Area */}
      <div className="relative w-full h-64 md:h-[450px] bg-slate-900 flex items-center justify-center overflow-hidden">
        {isCameraActive ? (
          <>
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
              muted
            />
            <div className="absolute inset-0 border-2 border-teal-500/50 m-8 rounded-lg pointer-events-none"></div>
            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">
                {stagedPages.length} item{stagedPages.length !== 1 && 's'} captured
              </span>
            </div>
          </>
        ) : (
          <div className="text-center p-8 text-slate-400 bg-slate-100 w-full h-full flex flex-col items-center justify-center">
             {stagedPages.length > 0 ? (
               <div className="grid grid-cols-3 gap-4 w-full max-w-md h-full overflow-y-auto p-4">
                 {stagedPages.map((page, idx) => (
                   <div key={idx} className="relative aspect-[3/4] bg-white rounded shadow-sm border border-slate-200 group overflow-hidden">
                      {page.mimeType === 'application/pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          <span className="text-[10px] font-bold mt-1">PDF</span>
                        </div>
                      ) : (
                        <img src={`data:${page.mimeType};base64,${page.data}`} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                      )}
                      
                      <button 
                        onClick={() => removePage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">#{idx + 1}</span>
                   </div>
                 ))}
                 {/* Add Placeholder to show flow */}
                 <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded text-slate-400 aspect-[3/4]">
                    <span className="text-xs">Next Item</span>
                 </div>
               </div>
             ) : (
                <>
                  <div className="mb-4 flex justify-center opacity-50 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-slate-600">Ready to Scan</p>
                  <p className="text-sm mt-2 text-slate-500 max-w-xs">Capture multiple pages to create a single comprehensive report.</p>
                </>
             )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 bg-white border-t border-slate-100">
         {isCameraActive ? (
            <div className="grid grid-cols-2 gap-4">
               <button
                  onClick={finishScanning}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-800 font-medium transition-colors"
               >
                  {stagedPages.length > 0 ? `Finish (${stagedPages.length})` : 'Done'}
               </button>
               <button
                  onClick={capturePhoto}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors shadow-lg shadow-teal-200"
               >
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  Capture Page
               </button>
            </div>
         ) : (
            <div className="flex flex-col gap-3">
               {stagedPages.length > 0 && (
                  <button
                    onClick={finishScanning}
                    className="w-full py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                     <span>Analyze {stagedPages.length} Item{stagedPages.length !== 1 && 's'}</span>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                     </svg>
                  </button>
               )}
               
               <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-medium transition-colors"
                  >
                    {CAMERA_ICON}
                    <span>{stagedPages.length > 0 ? 'Add Page' : 'Camera'}</span>
                  </button>
                  <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors cursor-pointer">
                    {DOC_ICON}
                    <span>Upload</span>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      multiple // Allow multiple files
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                    />
                  </label>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default Scanner;