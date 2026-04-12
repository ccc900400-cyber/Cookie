import { useState, useCallback, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Video, 
  File as FileIcon, 
  X, 
  CheckCircle2, 
  Loader2, 
  Download, 
  FileDown,
  Sparkles,
  History,
  RefreshCw,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { FileInfo, AppSettings } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { geminiService } from '../../services/geminiService';
import { storageService } from '../../services/storageService';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Error caught by boundary
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface AnalysisAgentProps {
  settings: AppSettings;
}

export default function AnalysisAgent({ settings }: AnalysisAgentProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [link, setLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result' | 'history'>('upload');
  const [history, setHistory] = useState<any[]>([]);
  const [progress, setProgress] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoaded = useRef(false);

  const t = useTranslation(settings.language);

  // Load history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedHistory = await storageService.getAllAnalysis();
        if (savedHistory && Array.isArray(savedHistory)) {
          setHistory(savedHistory);
        }
      } catch (e) {
        // Silent fail
      } finally {
        isLoaded.current = true;
      }
    };
    loadHistory();
  }, []);

  // Save history to IndexedDB whenever it changes
  useEffect(() => {
    if (isLoaded.current && history.length > 0) {
      // We save individual items in handleAnalyze, 
      // but we could sync full history if needed.
    }
  }, [history]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Clear current state and history
    setFiles([]);
    setLink('');
    setAnalysisResult(null);
    setHistory([]);
    setActiveTab('upload');
    try {
      await storageService.clearAnalysis();
    } catch (e) {
      // Silent fail
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const exportToWord = async () => {
    if (!analysisResult) return;
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: t.reportTitle,
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `日期: ${new Date().toLocaleString()}`,
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
            ...analysisResult.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line.replace(/[*#]/g, ''),
                    size: 24,
                  }),
                ],
              })
            ),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analysis_Report_${new Date().getTime()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("导出 Word 失败。");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const newFiles = acceptedFiles
      .filter(file => {
        if (file.size > MAX_SINGLE_FILE_SIZE) {
          return false;
        }
        return true;
      })
      .map(file => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'completed' as const,
        file // Store actual file for processing
      }));
    
    if (newFiles.length < acceptedFiles.length) {
      alert('部分文件因超过 100MB 限制已被忽略。');
    }
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'video/*': ['.mp4', '.mov', '.avi']
    }
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    if (files.length === 0 && !link) return;
    
    setIsProcessing(true);
    setActiveTab('result');
    setAnalysisResult(""); 
    setProgress(t.analyzing);

    try {
      const prompt = t.analysisPrompt;
      const systemInstruction = t.analysisSystem;
      const language = settings.language === 'en' ? 'English' : settings.language === 'zh-TW' ? 'Traditional Chinese' : 'Simplified Chinese';
      
      let stream;
      if (files.length > 0) {
        setProgress(t.analyzing);
        
        const rawFiles = files.map(f => f.file).filter((f): f is File => !!f);
        stream = await geminiService.analyzeLargeFilesStream(rawFiles, prompt, systemInstruction, language);
      } else {
        setProgress(t.fetchingLink);
        // Use server for link analysis to keep API key hidden
        stream = await geminiService.analyzeLargeFilesStream([], prompt, systemInstruction, language, link, true);
      }

      let fullResult = "";
      setProgress(t.analyzing);
      
      try {
        for await (const chunk of stream) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullResult += chunkText;
            // Clean result: remove ** and signatures
            const cleanedResult = fullResult
              .replace(/\*\*/g, '')
              .replace(/报告撰写：\s*数据分析专家/g, '')
              .replace(/日期：\s*\d{4}年\d{1,2}月\d{1,2}日/g, '')
              .trim();
            setAnalysisResult(cleanedResult);
          }
        }
      } catch (streamError: any) {
        console.error('[AnalysisAgent] Stream iteration error:', streamError);
        throw new Error(`Stream error: ${streamError.message || 'Unknown stream error'}`);
      }

      console.log('[AnalysisAgent] Analysis completed successfully.');
      // Add to history
      const newHistoryItem = {
        id: Date.now().toString(),
        name: files.length > 0 ? files.map(f => f.name).join(', ') : link,
        date: new Date().toLocaleString(),
        type: files.length > 0 ? (files[0].type.includes('video') ? 'Video' : 'File') : 'Link',
        status: t.completed,
        // No longer truncating result as IndexedDB can handle large data
        result: fullResult || t.noResponse
      };
      
      await storageService.saveAnalysis(newHistoryItem);
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]); // Keep last 50 in UI list
    } catch (error: any) {
      console.error('[AnalysisAgent] Analysis error:', error);
      setAnalysisResult(error.message || t.error);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  return (
    <ErrorBoundary fallback={
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <X size={32} />
        </div>
        <h3 className="text-lg font-semibold mb-2">应用发生错误</h3>
        <p className="text-muted-foreground mb-6">解析过程中出现意外错误，可能是因为文件过大或内存不足。</p>
        <Button onClick={() => window.location.reload()}>刷新页面</Button>
      </div>
    }>
      <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-2 md:px-8 py-2 md:py-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-10 gap-2 h-[64px]">
        <div className="flex items-center gap-1.5 md:gap-4 overflow-x-auto scrollbar-hide flex-1">
          <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-12 md:ml-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary hidden md:flex items-center justify-center text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <span className="font-bold text-sm md:text-lg tracking-tight">{t.analysis}</span>
          </div>
          <div className="flex p-0.5 bg-muted rounded-lg md:rounded-xl shrink-0">
            <button 
              onClick={() => setActiveTab('upload')}
              className={cn(
                "px-1.5 md:px-4 py-1 md:py-1.5 text-[10px] md:text-sm font-medium rounded-md md:rounded-lg transition-all whitespace-nowrap",
                activeTab === 'upload' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.importAnalysis}
            </button>
            <button 
              onClick={() => setActiveTab('result')}
              className={cn(
                "px-1.5 md:px-4 py-1 md:py-1.5 text-[10px] md:text-sm font-medium rounded-md md:rounded-lg transition-all whitespace-nowrap",
                activeTab === 'result' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.analysisResult}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-1.5 md:px-4 py-1 md:py-1.5 text-[10px] md:text-sm font-medium rounded-md md:rounded-lg transition-all whitespace-nowrap",
                activeTab === 'history' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.history}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh} 
            className={cn("rounded-lg h-8 w-8 md:h-10 md:w-10", isRefreshing && "animate-spin")}
            title={t.refresh}
          >
            <RefreshCw size={14} />
          </Button>
          <Button 
            onClick={handleAnalyze} 
            disabled={isProcessing || (files.length === 0 && !link)}
            className="rounded-lg shadow-lg shadow-primary/20 h-8 w-8 md:h-10 md:w-10 p-0"
            title={t.startAnalyze}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play size={16} className="fill-current" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'upload' && (
              <motion.div
                key="upload-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* File Upload Area */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Upload size={20} className="text-primary" />
                      {t.localImport}
                    </h3>
                    <div 
                      {...getRootProps()} 
                      className={cn(
                        "border-2 border-dashed rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                        isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="w-16 h-[60px] rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <Upload size={32} />
                      </div>
                      <p className="text-sm font-medium">{t.dropzoneText}</p>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.selectedFiles} ({files.length})</p>
                        <div className="grid gap-2">
                          {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-card border rounded-xl group hover:border-primary/50 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                {file.type.includes('video') ? <Video size={18} className="text-blue-500" /> : <FileText size={18} className="text-orange-500" />}
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-sm font-medium truncate">{file.name}</span>
                                  <span className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                              </div>
                              <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Link Parsing Area */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <LinkIcon size={20} className="text-primary" />
                      {t.linkParsing}
                    </h3>
                    <Card className="rounded-3xl overflow-hidden border-2 border-muted h-auto min-h-[200px] w-full max-w-md">
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="link">{t.linkPlaceholder}</Label>
                          </div>
                          <div className="flex gap-2">
                            <Input 
                              id="link"
                              placeholder="https://example.com/video" 
                              value={link}
                              onChange={(e) => setLink(e.target.value)}
                              className="rounded-xl h-10"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'result' && (
              <motion.div
                key="result-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {!analysisResult && !isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-muted-foreground">
                      <FileText size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">{t.noResult}</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        {t.noResultDesc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto">
                    {/* Main Report */}
                    <Card className="rounded-3xl shadow-xl border-none bg-card/50 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{t.reportTitle}</CardTitle>
                            <CardDescription>{t.reportDesc}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="rounded-lg" onClick={exportToWord}>
                              <FileDown size={16} className="mr-2" />
                              {t.exportWord}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8">
                        {isProcessing && !analysisResult ? (
                          <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                              <Loader2 className="h-12 w-12 text-primary animate-spin" />
                              <p className="text-sm font-medium text-muted-foreground animate-pulse">{progress}</p>
                            </div>
                            <div className="space-y-4 animate-pulse">
                              <div className="h-8 bg-muted rounded w-1/3" />
                              <div className="h-4 bg-muted rounded w-full" />
                              <div className="h-4 bg-muted rounded w-full" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm md:prose-base prose-blue dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult || ''}</ReactMarkdown>
                            {isProcessing && (
                              <div className="flex items-center gap-2 mt-4 text-primary animate-pulse">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-xs font-medium">{t.analyzing}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History size={20} className="text-primary" />
                    {t.historyTitle}
                  </h3>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setHistory([])}>{t.clearHistoryBtn}</Button>
                </div>
                
                <div className="grid gap-4">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground">
                      <History size={48} className="mb-4 opacity-20" />
                      <p>{t.noResult}</p>
                    </div>
                  ) : (
                    history.map((item, i) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-4 bg-card border rounded-2xl hover:border-primary/50 transition-all cursor-pointer group"
                        onClick={() => {
                          setAnalysisResult(item.result);
                          setActiveTab('result');
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {item.type === 'Video' ? <Video size={20} /> : (item.type === 'Link' ? <LinkIcon size={20} /> : <FileIcon size={20} />)}
                          </div>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[300px]">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.date} • {item.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                          <Button variant="ghost" size="icon" className="rounded-lg">
                            <Download size={16} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
    </ErrorBoundary>
  );
}
