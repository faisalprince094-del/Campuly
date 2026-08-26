import { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from './aiService';

interface VoiceRecorderOptions {
  silenceDurationMs?: number; // Time of silence after speech before auto-stopping (default 3200ms)
  onFinalTranscript: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useContinuousVoiceRecorder({
  silenceDurationMs = 3200,
  onFinalTranscript,
  onError,
  onToast,
}: VoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1
  const [liveTranscript, setLiveTranscript] = useState('');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  // Refs for audio handling
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Speech tracking refs
  const hasSpokenRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const liveTranscriptRef = useRef('');

  // Web Speech API recognition fallback/live preview
  const recognitionRef = useRef<any>(null);

  // Clean up all audio resources
  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
    setSilenceCountdown(null);
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Stop recording and process full audio
  const stopRecording = useCallback(
    async (isAutoSilence = false) => {
      if (!isRecordingRef.current || isStoppingRef.current) return;
      isStoppingRef.current = true;
      isRecordingRef.current = false;
      setIsRecording(false);
      setSilenceCountdown(null);

      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }

      // Stop media recorder and get audio
      const recorder = mediaRecorderRef.current;
      const chunks = audioChunksRef.current;
      const stream = mediaStreamRef.current;

      cleanupAudio();

      const finalLiveText = liveTranscriptRef.current.trim();

      if (!recorder || recorder.state === 'inactive') {
        isStoppingRef.current = false;
        if (finalLiveText) {
          onFinalTranscript(finalLiveText);
        } else if (!isAutoSilence) {
          onToast?.('No speech detected. Try speaking clearly.', 'warning');
        }
        return;
      }

      setIsTranscribing(true);

      const processAudio = async (blob: Blob) => {
        try {
          let recognizedText = '';

          if (blob.size > 2000) {
            const base64Audio = await blobToBase64(blob);
            const mime = blob.type || 'audio/webm';
            const res = await aiService.transcribeVoice({
              audioBase64: base64Audio,
              mimeType: mime,
            });

            if (res && res.transcript && res.transcript.trim()) {
              recognizedText = res.transcript.trim();
            }
          }

          // Fallback to Web Speech API live transcript if AI returned empty but we got words
          if (!recognizedText && finalLiveText) {
            recognizedText = finalLiveText;
          }

          if (recognizedText) {
            onFinalTranscript(recognizedText);
          } else {
            if (!isAutoSilence || hasSpokenRef.current) {
              onToast?.('Could not clearly understand speech. Please try again.', 'warning');
            }
          }
        } catch (err: any) {
          console.error('Transcription processing error:', err);
          if (finalLiveText) {
            onFinalTranscript(finalLiveText);
          } else {
            onError?.(err?.message || 'Failed to process voice input');
            onToast?.('Voice transcription failed. You can type your question.', 'warning');
          }
        } finally {
          setIsTranscribing(false);
          isStoppingRef.current = false;
          setLiveTranscript('');
          liveTranscriptRef.current = '';
        }
      };

      if (recorder.state === 'recording') {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(chunks, { type: mimeType });
          processAudio(audioBlob);
        };
        try {
          recorder.stop();
        } catch (e) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          processAudio(audioBlob);
        }
      } else {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        processAudio(audioBlob);
      }
    },
    [cleanupAudio, onFinalTranscript, onError, onToast]
  );

  // Cancel recording completely without sending
  const cancelRecording = useCallback(() => {
    isRecordingRef.current = false;
    isStoppingRef.current = false;
    setIsRecording(false);
    setIsTranscribing(false);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    cleanupAudio();
    onToast?.('Voice input cancelled', 'info');
  }, [cleanupAudio, onToast]);

  // Start continuous, silence-aware voice recording
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isTranscribing) return;

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      lastSpeechTimeRef.current = Date.now();
      isRecordingRef.current = true;
      isStoppingRef.current = false;
      liveTranscriptRef.current = '';
      setLiveTranscript('');
      setIsRecording(true);

      // 2. Set up Audio Analyser for real-time waveform & silence detection
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Silence & Speech Monitoring Loop
      const checkAudioLevels = () => {
        if (!isRecordingRef.current) return;

        analyser.getByteFrequencyData(dataArray);

        // Compute average RMS volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length; // 0 to 255
        const normalizedLevel = Math.min(1, Math.max(0, avg / 80));
        setAudioLevel(normalizedLevel);

        const now = Date.now();
        // Voice threshold (voice detected if level > 0.08)
        const isSpeakingNow = avg > 9;

        if (isSpeakingNow) {
          hasSpokenRef.current = true;
          lastSpeechTimeRef.current = now;
          setSilenceCountdown(null);
        } else if (hasSpokenRef.current) {
          // Student was speaking, now there is a pause/silence
          const silenceDuration = now - lastSpeechTimeRef.current;
          const remainingMs = silenceDurationMs - silenceDuration;

          if (remainingMs > 0 && remainingMs <= 2000) {
            setSilenceCountdown(Math.ceil(remainingMs / 1000));
          } else {
            setSilenceCountdown(null);
          }

          // Check if silence exceeded the continuous pause threshold (e.g. 3.2s)
          if (silenceDuration >= silenceDurationMs) {
            // Student finished speaking naturally!
            stopRecording(true);
            return;
          }
        }

        animFrameRef.current = requestAnimationFrame(checkAudioLevels);
      };

      animFrameRef.current = requestAnimationFrame(checkAudioLevels);

      // 3. Set up MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250); // Slice into 250ms chunks

      // 4. Parallel Web Speech Recognition (for instant live preview if available)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            if (!isRecordingRef.current) return;
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + ' ';
            }
            const cleanText = fullText.trim();
            if (cleanText) {
              hasSpokenRef.current = true;
              lastSpeechTimeRef.current = Date.now();
              setLiveTranscript(cleanText);
              liveTranscriptRef.current = cleanText;
            }
          };

          recognition.onend = () => {
            // If browser recognition stops prematurely but student is still recording, auto-restart it!
            if (isRecordingRef.current && !isStoppingRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.onerror = (event: any) => {
            // Ignore non-fatal speech recognition errors in background, MediaRecorder is primary
            if (event.error === 'not-allowed') {
              console.warn('Speech recognition permission denied');
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (e) {
          console.warn('Live speech recognition setup notice:', e);
        }
      }

      onToast?.('Listening... Speak freely in English or Bengali.', 'info');
    } catch (err: any) {
      console.error('Failed to start voice recorder:', err);
      cleanupAudio();
      setIsRecording(false);
      isRecordingRef.current = false;

      let msg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone access was denied. Please allow microphone permissions in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No microphone device was found on this system.';
      }
      onError?.(msg);
      onToast?.(msg, 'error');
    }
  }, [silenceDurationMs, stopRecording, cleanupAudio, isTranscribing, onError, onToast]);

  return {
    isRecording,
    isTranscribing,
    audioLevel,
    liveTranscript,
    silenceCountdown,
    startRecording,
    stopRecording: () => stopRecording(false),
    cancelRecording,
  };
}
