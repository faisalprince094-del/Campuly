import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  UploadCloud,
  Move,
} from 'lucide-react';
import { cropAndOptimizeAvatar, CropSettings } from '../../utils/imageStorage';

interface ImageCropModalProps {
  isOpen: boolean;
  imageElement: HTMLImageElement | null;
  imageSrc: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
  onChangeImageRequest: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageElement,
  imageSrc,
  onClose,
  onApplyCrop,
  onChangeImageRequest,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [livePreviewUrl, setLivePreviewUrl] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset controls when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Generate live circular preview on state change
  useEffect(() => {
    if (!imageElement || !isOpen) return;

    try {
      const cropped = cropAndOptimizeAvatar(imageElement, {
        x: offset.x,
        y: offset.y,
        zoom,
        rotation,
        targetSize: 160,
      });
      setLivePreviewUrl(cropped);
    } catch {
      // ignore live preview render errors
    }
  }, [imageElement, zoom, rotation, offset, isOpen]);

  // Drag handlers for mouse & touch
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - offset.x,
      y: clientY - offset.y,
    });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(3, Math.max(1, Number(newZoom.toFixed(2))));
    setZoom(clamped);
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to center
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Final apply
  const handleApply = () => {
    if (!imageElement) return;
    try {
      const finalCropped = cropAndOptimizeAvatar(imageElement, {
        x: offset.x,
        y: offset.y,
        zoom,
        rotation,
        targetSize: 384,
      });
      onApplyCrop(finalCropped);
    } catch (err) {
      console.error('Failed to crop image:', err);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      id="image-crop-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="image-crop-modal-content"
        className="w-full max-w-lg bg-white dark:bg-[#0B1017] rounded-3xl border border-slate-200/80 dark:border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Crop Profile Photo</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Drag and zoom to position your photo inside the circle
            </p>
          </div>
          <button
            id="close-crop-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#101823] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scroll">
          {/* Main Cropping Viewport */}
          <div className="flex flex-col items-center">
            <div
              ref={containerRef}
              id="crop-viewport-container"
              className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing border-2 border-dashed border-blue-500/40 shadow-inner flex items-center justify-center touch-none"
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => {
                if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchEnd={handlePointerUp}
            >
              {/* Scaled & Rotated Image */}
              <div
                className="absolute transition-transform duration-75 ease-out pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={imageSrc}
                  alt="Crop Target"
                  className="max-w-none w-64 h-64 sm:w-72 sm:h-72 object-contain pointer-events-none"
                  draggable={false}
                />
              </div>

              {/* Circular Overlay Mask Guideline */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Translucent mask around circular aperture */}
                <div className="w-56 h-56 sm:w-60 sm:h-60 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(5,7,10,0.7)] ring-2 ring-blue-500/50" />
              </div>

              {/* Pan Hint Overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-[10px] text-white/90 flex items-center gap-1 pointer-events-none">
                <Move className="w-3 h-3" />
                <span>Drag to reposition</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Zoom, Rotate, Reset */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#101823]/60 p-4 rounded-2xl border border-slate-100 dark:border-[#1E293B]">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.2)}
                className="w-7 h-7 rounded-lg bg-white dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                id="crop-zoom-slider"
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />

              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.2)}
                className="w-7 h-7 rounded-lg bg-white dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-bold text-slate-500 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Extra Actions: Rotate, Reset, Live Avatar Preview */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="rotate-crop-btn"
                  onClick={handleRotate}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 hover:text-blue-600 transition cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Rotate</span>
                </button>

                <button
                  type="button"
                  id="reset-crop-btn"
                  onClick={handleReset}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 hover:text-blue-600 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Live Mini Preview */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400">Preview:</span>
                {livePreviewUrl ? (
                  <img
                    src={livePreviewUrl}
                    alt="Preview"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-600/30 shadow-xs"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    S
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#101823]/60 border-t border-slate-100 dark:border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            id="choose-different-photo-btn"
            onClick={onChangeImageRequest}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-[#F8FAFC] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Choose Different Photo</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="cancel-crop-btn"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#101823] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="apply-crop-btn"
              onClick={handleApply}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Photo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
