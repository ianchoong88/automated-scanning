import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CAMERA_ICON, DOC_ICON } from '../constants';

interface ScannerProps {
  onScanStart: () => void;
  onScanComplete: (base64: string, mimeType: string, fileName?: string) => void;
  onScanError: (msg: string) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanStart, onScanComplete, onScanError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

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
      onScanStart();
      try {
        const video = videoRef.current;
        const dataUrl = processImage(video, video.videoWidth, video.videoHeight);
        const base64 = dataUrl.split(',')[1];
        onScanComplete(base64, 'image/jpeg', `Capture_${new Date().toISOString()}.jpg`);
        stopCamera();
      } catch (e) {
        onScanError("Failed to capture and process image.");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onScanStart();

    if (file.type.startsWith('image/')) {
      // Resize images
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const dataUrl = processImage(img, img.width, img.height);
            const base64 = dataUrl.split(',')[1];
            onScanComplete(base64, 'image/jpeg', file.name); // Convert all images to jpeg
          } catch (e) {
            onScanError("Failed to process image.");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => onScanError("Failed to read file.");
      reader.readAsDataURL(file);
    } else {
      // Pass through PDFs and others directly
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        onScanComplete(base64, file.type, file.name);
      };
      reader.onerror = () => onScanError("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Viewport Area */}
      <div className="relative w-full h-64 md:h-[500px] bg-slate-900 flex items-center justify-center overflow-hidden">
        {isCameraActive ? (
          <>
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
              muted
            />
            <div className="absolute inset-0 border-2 border-teal-500/50 m-8 rounded-lg pointer-events-none"></div>
          </>
        ) : (
          <div className="text-center p-8 text-slate-400 bg-slate-100 w-full h-full flex flex-col items-center justify-center">
            <div className="mb-4 flex justify-center opacity-50 text-slate-300">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-600">Ready to Scan</p>
            <p className="text-sm mt-2 text-slate-500 max-w-xs">Upload a medical document or use your camera to capture it.</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 grid grid-cols-2 gap-4 bg-white border-t border-slate-100">
        {isCameraActive ? (
          <>
             <button
              onClick={stopCamera}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors shadow-lg shadow-teal-200"
            >
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              Capture
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startCamera}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-medium transition-colors"
            >
              {CAMERA_ICON}
              <span>Camera</span>
            </button>
            <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors cursor-pointer">
              {DOC_ICON}
              <span>Upload File</span>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
};

export default Scanner;