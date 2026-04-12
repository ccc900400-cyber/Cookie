import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, FileText, Users, Lightbulb, CheckCircle2, Download, Copy, Check, 
  Loader2, StopCircle, Volume2, History, Trash2, Calendar, Clock, ChevronRight,
  Play, Pause, Share2, MoreVertical, Settings2, Headphones, DownloadCloud
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../../lib/i18n';
import { AppSettings } from '../../types';
import { storageService } from '../../services/storageService';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Document, Packer, Paragraph, TextRun } from 'docx';

import { GoogleGenAI } from "@google/genai";

interface MinutesAgentProps {
  settings: AppSettings;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface RecordingSession {
  id: string;
  title: string;
  date: string;
  duration: string;
  summary: string;
  transcript: string;
  audioBlob?: Blob;
}

export default function MinutesAgent({ settings }: MinutesAgentProps) {
  const t = useTranslation(settings.language);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'completed' | 'history'>('idle');
  const [summary, setSummary] = useState('');
  const [transcript, setTranscript] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'summary' | 'transcript'>('summary');
  const [copied, setCopied] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [history, setHistory] = useState<RecordingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RecordingSession | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [volume, setVolume] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimeRef = useRef(0);
  const maxVolumeRef = useRef(0);

  const workflow = t.minutesWorkflow;

  // Load history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedHistory = await storageService.getAllMinutes();
        if (savedHistory) {
          setHistory(savedHistory);
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    };
    loadHistory();
  }, []);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      recordingTimeRef.current = 0;
      maxVolumeRef.current = 0;
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
        if (isRecording) {
          checkVolume();
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const checkVolume = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = (dataArray[i] - 128) / 128;
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const volumeValue = Math.round(rms * 100);
    setVolume(volumeValue);
    if (volumeValue > maxVolumeRef.current) {
      maxVolumeRef.current = volumeValue;
    }
  };

  // Waveform Animation
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#007AFF';
        const barWidth = 3;
        const gap = 2;
        const bars = canvas.width / (barWidth + gap);

        for (let i = 0; i < bars; i++) {
          const height = Math.random() * canvas.height * 0.8;
          const x = i * (barWidth + gap);
          const y = (canvas.height - height) / 2;
          
          // Gradient effect
          const gradient = ctx.createLinearGradient(0, y, 0, y + height);
          gradient.addColorStop(0, '#007AFF');
          gradient.addColorStop(1, '#5AC8FA');
          ctx.fillStyle = gradient;
          
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, height, 2);
          ctx.fill();
        }
        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = async () => {
    if (status === 'idle' || status === 'completed' || status === 'history') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Setup Audio Context for volume detection
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';
          
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          
          // Check if recording is valid (at least 1 second and some sound)
          if (recordingTimeRef.current < 1 || maxVolumeRef.current < 2) {
            console.log(`Recording skipped: time=${recordingTimeRef.current}s, maxVolume=${maxVolumeRef.current}`);
            setStatus('idle');
            setIsRecording(false);
            cleanupAudio();
            return;
          }
          
          await processAudio(blob);
        };

        setIsRecording(true);
        setStatus('recording');
        setSummary('');
        setRecordingTime(0);
        mediaRecorder.start();
      } catch (err) {
        console.error("Failed to start recording:", err);
        alert(t.micPermissionError);
      }
    } else if (status === 'recording') {
      stopRecording();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupAudio();
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setStatus('idle');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupAudio();
    audioChunksRef.current = [];
  };

  const cleanupAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const processAudio = async (blob: Blob) => {
    setStatus('processing');
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      // Call Gemini for transcription and summarization
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "audio/webm",
                  data: base64Data
                }
              },
              {
                text: "请作为一名专业的会议记录员，对这段音频进行深度分析。你的任务包括：\n\n1. 完整转录：将音频内容完整转录为文字，并尽可能区分不同的发言人（如：发言人1、发言人2等）。\n2. 智能摘要：基于转录内容，生成一份结构化、专业且易于阅读的会议纪要。纪要应包含：\n   - 会议主题：简明扼要地概括会议核心内容。\n   - 核心观点：列出各发言人的主要论点和贡献。\n   - 结论与共识：总结会议达成的最终决定或共识。\n   - 待办事项：清晰列出后续行动项，并注明负责人（如果提及）和截止日期。\n\n请严格按照以下格式输出：\n\n[TRANSCRIPT]\n(此处为带发言人区分的完整转录文字)\n\n[SUMMARY]\n(此处为结构化会议纪要)\n\n注意：输出内容中严禁使用双星号（**）进行加粗。如果音频中没有任何人说话或者只有噪音，请只回复：'未检测到有效语音内容，无法生成纪要。'"
              }
            ]
          }
        ]
      });

      let resultText = response.text || t.error;
      
      // Remove any double asterisks from the result
      resultText = resultText.replace(/\*\*/g, '');
      
      if (resultText.includes("未检测到有效语音内容")) {
        alert(t.noSpeechError);
        setStatus('idle');
        return;
      }

      let finalTranscript = "";
      let finalSummary = "";

      if (resultText.includes("[TRANSCRIPT]") && resultText.includes("[SUMMARY]")) {
        finalTranscript = resultText.split("[TRANSCRIPT]")[1].split("[SUMMARY]")[0].trim();
        finalSummary = resultText.split("[SUMMARY]")[1].trim();
      } else {
        finalSummary = resultText;
        finalTranscript = "未能提取原始转录。";
      }

      setTranscript(finalTranscript);
      setSummary(finalSummary);
      
      // Save to history
      const newSession: RecordingSession = {
        id: Date.now().toString(),
        title: `${t.minutes} ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleString(),
        duration: formatTime(recordingTimeRef.current),
        summary: finalSummary,
        transcript: finalTranscript,
        audioBlob: blob
      };
      await storageService.saveMinutes(newSession);
      setHistory(prev => [newSession, ...prev]);
      setSelectedSession(newSession);
      setStatus('completed');
    } catch (error) {
      console.error("Processing error:", error);
      alert(t.processingError);
      setStatus('idle');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (session: RecordingSession) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: session.title,
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${t.date}: ${session.date}`,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${t.duration}: ${session.duration}`,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "\n",
                }),
              ],
            }),
            ...session.summary.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line.replace(/[*#]/g, ''),
                    size: 24,
                  }),
                ],
              })
            ),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\n\n${t.rawTranscript}:\n`,
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            ...session.transcript.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 22,
                  }),
                ],
              })
            ),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(t.exportError);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await storageService.deleteMinutes(id);
      setHistory(prev => prev.filter(s => s.id !== id));
      if (selectedSession?.id === id) {
        setSelectedSession(null);
        setStatus('idle');
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  const playAudio = () => {
    if (!selectedSession?.audioBlob) return;
    if (isPlaying) {
      audioPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioPlayerRef.current) {
        const url = URL.createObjectURL(selectedSession.audioBlob);
        audioPlayerRef.current = new Audio(url);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadAudio = () => {
    if (!selectedSession?.audioBlob) return;
    const url = URL.createObjectURL(selectedSession.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audio_${selectedSession.title}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [selectedSession]);

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] dark:bg-[#000000] overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-16 border-b bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-between px-2 md:px-8 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary hidden md:flex items-center justify-center text-white shadow-sm">
            <Mic size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight ml-12 md:ml-0">{t.minutes}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setStatus('history');
              setSelectedSession(null);
            }}
            className={cn("rounded-full gap-2", status === 'history' && "bg-primary/10 text-primary")}
          >
            <History size={18} />
            {t.history}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            {(status === 'idle' || status === 'history') && !selectedSession && (
              <motion.div
                key="idle-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {status === 'idle' ? (
                  <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center h-full space-y-8">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={toggleRecording}
                      className="cursor-pointer max-w-sm mx-auto w-full"
                    >
                      <Card className="p-6 border-none bg-primary text-white rounded-[32px] shadow-2xl shadow-primary/20 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                          <Mic size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{t.startMinutes}</h3>
                          <p className="text-white/80 text-sm mt-1">{t.startMinutesDesc}</p>
                        </div>
                      </Card>
                    </motion.div>
                    <p className="text-muted-foreground text-base max-w-md text-center px-4">{t.minutesTagline}</p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">{t.historyRecords}</h2>
                      <p className="text-sm text-muted-foreground">{t.totalRecords.replace('{{count}}', history.length.toString())}</p>
                    </div>

                    {history.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                          <History size={40} />
                        </div>
                        <p className="text-muted-foreground">{t.noHistory}</p>
                        <Button onClick={() => setStatus('idle')}>{t.goToRecord}</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {history.map((session) => (
                          <Card 
                            key={session.id} 
                            onClick={() => setSelectedSession(session)}
                            className="p-5 border-none bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-sm hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <Volume2 size={20} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{session.duration}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSession(session.id);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                            <h4 className="font-bold mb-1 truncate">{session.title}</h4>
                            <p className="text-xs text-muted-foreground mb-4">{session.date}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-muted/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{t.viewDetails}</span>
                              <ChevronRight size={14} className="text-muted-foreground" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {(status === 'recording' || status === 'processing') && (
              <motion.div
                key="active-session"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 bg-[#F8F9FA]/95 dark:bg-black/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="max-w-2xl w-full space-y-8 md:space-y-12">
                  <div className="relative mx-auto w-48 h-48 md:w-64 md:h-64">
                    <motion.div
                      animate={{ 
                        scale: status === 'recording' ? [1, 1.2, 1] : 1,
                        opacity: status === 'recording' ? [0.3, 0.1, 0.3] : 0.1
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-primary rounded-full blur-2xl md:blur-3xl"
                    />
                    <div className="relative w-full h-full rounded-full bg-white dark:bg-[#1C1C1E] shadow-2xl flex flex-col items-center justify-center border border-primary/10">
                      {status === 'recording' ? (
                        <>
                          <div className="absolute top-8 md:top-12 text-primary/40 font-bold uppercase tracking-widest text-[10px]">{t.recordingStatus}</div>
                          <canvas ref={canvasRef} width={200} height={80} className="w-32 h-12 md:w-40 md:h-16 mb-2 md:mb-4" />
                          <div className="w-full max-w-[120px] md:max-w-[160px] h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, volume * 2)}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                          <div className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-primary">
                            {formatTime(recordingTime)}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-4 md:gap-6">
                          <div className="relative">
                            <Loader2 size={48} className="text-primary animate-spin md:w-16 md:h-16" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse" />
                            </div>
                          </div>
                          <span className="font-bold text-lg md:text-xl text-primary tracking-tight">{t.aiAnalyzing}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <h3 className="text-2xl md:text-4xl font-bold tracking-tight">
                      {status === 'recording' ? t.listening : t.generatingMinutes}
                    </h3>
                    <p className="text-muted-foreground text-base md:text-xl max-w-lg mx-auto leading-relaxed px-4">
                      {status === 'recording' 
                        ? t.listeningDesc 
                        : t.generatingMinutesDesc}
                    </p>
                  </div>

                  {status === 'recording' && (
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <Button 
                        onClick={toggleRecording}
                        className="rounded-full h-16 md:h-20 px-8 md:px-12 text-lg md:text-xl font-bold shadow-2xl shadow-primary/20 gap-3 md:gap-4 hover:scale-105 transition-transform"
                      >
                        <StopCircle size={28} className="md:w-8 md:h-8" />
                        {t.stopAndGenerate}
                      </Button>
                      <Button 
                        onClick={handleCancelRecording}
                        variant="outline"
                        className="rounded-full h-16 md:h-20 px-8 md:px-12 text-lg md:text-xl font-bold gap-3 md:gap-4 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={28} className="md:w-8 md:h-8" />
                        {t.cancel}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {(status === 'completed' || (status === 'history' && selectedSession)) && (
              <motion.div
                key="result-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-32"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight">{selectedSession?.title}</h2>
                    <div className="flex items-center gap-3 md:gap-4 mt-1.5 md:mt-2 text-xs md:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {selectedSession?.date}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {selectedSession?.duration}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession?.audioBlob && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={playAudio} 
                          className={cn("rounded-full gap-2 h-9", isPlaying && "bg-primary/10 text-primary border-primary/50")}
                        >
                          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                          <span className="hidden sm:inline">{isPlaying ? t.pauseAudio : t.playAudio}</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={downloadAudio} 
                          className="rounded-full gap-2 h-9"
                        >
                          <DownloadCloud size={16} />
                          <span className="hidden sm:inline">{t.downloadAudio}</span>
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopy(activeResultTab === 'summary' ? (selectedSession?.summary || "") : (selectedSession?.transcript || ""))} 
                      className="rounded-full gap-2 h-9"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span className="hidden sm:inline">{t.copy}</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full gap-2 h-9"
                      onClick={() => selectedSession && handleExport(selectedSession)}
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">{t.export}</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full gap-2 h-9 text-red-500 hover:text-red-600"
                      onClick={() => selectedSession && deleteSession(selectedSession.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex p-1 bg-muted rounded-xl w-fit">
                      <button 
                        onClick={() => setActiveResultTab('summary')}
                        className={cn(
                          "px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all",
                          activeResultTab === 'summary' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t.smartMinutes}
                      </button>
                      <button 
                        onClick={() => setActiveResultTab('transcript')}
                        className={cn(
                          "px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all",
                          activeResultTab === 'transcript' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t.rawTranscript}
                      </button>
                    </div>

                    <Card className="p-4 md:p-8 border-none bg-white dark:bg-[#1C1C1E] rounded-[24px] md:rounded-[32px] shadow-sm">
                      <div className="flex items-center gap-2 mb-4 md:mb-6 text-primary font-bold">
                        {activeResultTab === 'summary' ? <FileText size={20} /> : <Volume2 size={20} />}
                        <span className="text-base md:text-lg">{activeResultTab === 'summary' ? t.smartMinutes : t.rawTranscript}</span>
                      </div>
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                        <div className="leading-relaxed text-sm md:text-lg whitespace-pre-wrap">
                          {activeResultTab === 'summary' ? (
                            <ReactMarkdown>{selectedSession?.summary || ""}</ReactMarkdown>
                          ) : (
                            <p>{selectedSession?.transcript || ""}</p>
                          )}
                        </div>
                      </div>
                    </Card>

                    <Button 
                      onClick={() => {
                        setStatus('idle');
                        setSelectedSession(null);
                      }}
                      className="w-full rounded-full h-12 md:h-14 text-base md:text-lg font-bold"
                    >
                      {t.startNewRecord}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Helper for ASR icon (using RefreshCw as a base)
function RefreshCw({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
