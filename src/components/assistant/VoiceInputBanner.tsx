import React from 'react';
import { Square, X, Sparkles, Volume2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceInputBannerProps {
  isRecording: boolean;
  isTranscribing: boolean;
  audioLevel: number;
  liveTranscript: string;
  silenceCountdown: number | null;
  onStop: () => void;
  onCancel: () => void;
}

export const VoiceInputBanner: React.FC<VoiceInputBannerProps> = ({
  isRecording,
  isTranscribing,
  audioLevel,
  liveTranscript,
  silenceCountdown,
  onStop,
  onCancel,
}) => {
  if (!isRecording && !isTranscribing) return null;

  // Generate 12 responsive waveform bars based on audio level
  const bars = [0.35, 0.6, 0.9, 0.45, 0.8, 1.0, 0.75, 0.5, 0.85, 0.4, 0.7, 0.3];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="mb-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900/95 text-white shadow-xl shadow-blue-950/20 border border-blue-500/30 backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Live recording indicator light */}
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
              <span className="w-3 h-3 rounded-full bg-rose-500 relative" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  {isTranscribing ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                      Converting voice to text...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                      Listening continuously...
                    </>
                  )}
                </span>
                {silenceCountdown !== null && isRecording && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium">
                    Silence detected: sending in {silenceCountdown}s
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-blue-200/80 flex items-center gap-1 mt-0.5">
                <Globe className="w-3 h-3 text-blue-300/80" />
                Speak in English, Bengali (বাংলা), or mixed Banglish — Campusly AI answers in English
              </span>
            </div>
          </div>

          {/* Action buttons: Manual Stop & Cancel */}
          <div className="flex items-center gap-2">
            {!isTranscribing && (
              <>
                <button
                  type="button"
                  onClick={onStop}
                  className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition cursor-pointer"
                  title="Finish speaking and send"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Done Speaking</span>
                  <span className="sm:hidden">Done</span>
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Cancel voice input"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Audio Waveform Animation */}
        {!isTranscribing && (
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-7 py-1 bg-black/20 rounded-xl px-3 border border-white/5">
            {bars.map((mult, i) => {
              // Dynamic height scaling with audio level
              const dynamicHeight = Math.max(
                4,
                Math.min(24, Math.round(audioLevel * mult * 28 + (audioLevel > 0.05 ? 6 : 2)))
              );

              return (
                <div
                  key={i}
                  className="w-1 sm:w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: `${dynamicHeight}px`,
                    backgroundColor:
                      audioLevel > 0.1
                        ? `rgb(${Math.min(255, 60 + i * 16)}, ${Math.min(255, 130 + i * 10)}, 255)`
                        : 'rgba(147, 197, 253, 0.35)',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Live Speech Preview */}
        {liveTranscript && (
          <div className="mt-2 text-xs text-blue-100/90 italic bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 truncate max-w-full">
            "{liveTranscript}"
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
