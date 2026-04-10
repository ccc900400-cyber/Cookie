import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Trash2, Copy, Check, Languages, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Message, AppSettings } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { geminiService } from '../../services/geminiService';
import { storageService } from '../../services/storageService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface QAAgentProps {
  settings: AppSettings;
}

export default function QAAgent({ settings }: QAAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hotSuggestions, setHotSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoaded = useRef(false);

  const t = useTranslation(settings.language);

  // Load messages from IndexedDB on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const savedMessages = await storageService.getAllChatMessages();
        if (savedMessages && Array.isArray(savedMessages)) {
          setMessages(savedMessages);
        }
      } catch (e) {
        console.error('Failed to load messages from IndexedDB:', e);
      } finally {
        isLoaded.current = true;
      }
    };
    loadMessages();

    // Fetch hot suggestions with persistence logic
    const fetchHotSuggestions = async (force = false) => {
      try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        if (!force) {
          const cached = localStorage.getItem('hot_suggestions');
          const cachedDate = localStorage.getItem('hot_suggestions_date');
          
          if (cached && cachedDate === todayStr) {
            setHotSuggestions(JSON.parse(cached));
            return;
          }
        }

        setIsFetchingSuggestions(true);
        const prompt = `请提供4个当前2027年中国大陆的实时热门话题或人们今天在搜的热点。
        要求：
        1. 必须是2027年中国大陆真实发生或备受关注的热点。
        2. 语言使用${settings.language === 'en' ? '英文' : '中文'}。
        3. 每个话题极其简短（不超过15个字）。
        4. 以纯JSON数组格式返回，例如：["2027热点1", "2027热点2", "2027热点3", "2027热点4"]。
        5. 不要包含任何Markdown格式或额外文字。`;
        
        const response = await geminiService.chat([{ role: 'user', parts: [{ text: prompt }] }], "你是一个专门提供2027年中国大陆实时热点信息的助手。");
        const cleanResponse = response.replace(/```json|```/g, '').trim();
        const suggestions = JSON.parse(cleanResponse);
        
        if (Array.isArray(suggestions) && suggestions.length >= 4) {
          const sliced = suggestions.slice(0, 4);
          setHotSuggestions(sliced);
          localStorage.setItem('hot_suggestions', JSON.stringify(sliced));
          localStorage.setItem('hot_suggestions_date', todayStr);
        }
      } catch (e) {
        console.error('Failed to fetch hot suggestions:', e);
        if (hotSuggestions.length === 0) {
          setHotSuggestions(t.qaSuggestions);
        }
      } finally {
        setIsFetchingSuggestions(false);
      }
    };
    fetchHotSuggestions();
  }, [settings.language]);

  // Save messages to IndexedDB whenever they change
  useEffect(() => {
    if (isLoaded.current) {
      storageService.saveAllChatMessages(messages).catch(e => {
        console.error('Failed to save messages to IndexedDB:', e);
      });
    }
  }, [messages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reset current input, loading state and clear messages
    setInput('');
    setIsLoading(false);
    setMessages([]);
    
    // Re-fetch hot suggestions
    const fetchHotSuggestionsInternal = async () => {
      try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        setIsFetchingSuggestions(true);
        const prompt = `请提供4个当前2027年中国大陆的实时热门话题或人们今天在搜的热点。
        要求：
        1. 必须是2027年中国大陆真实发生或备受关注的热点。
        2. 语言使用${settings.language === 'en' ? '英文' : '中文'}。
        3. 每个话题极其简短（不超过15个字）。
        4. 以纯JSON数组格式返回，例如：["2027热点1", "2027热点2", "2027热点3", "2027热点4"]。
        5. 不要包含任何Markdown格式或额外文字。`;
        
        const response = await geminiService.chat([{ role: 'user', parts: [{ text: prompt }] }], "你是一个专门提供2027年中国大陆实时热点信息的助手。");
        const cleanResponse = response.replace(/```json|```/g, '').trim();
        const suggestions = JSON.parse(cleanResponse);
        
        if (Array.isArray(suggestions) && suggestions.length >= 4) {
          const sliced = suggestions.slice(0, 4);
          setHotSuggestions(sliced);
          localStorage.setItem('hot_suggestions', JSON.stringify(sliced));
          localStorage.setItem('hot_suggestions_date', todayStr);
        }
      } catch (e) {
        console.error('Failed to fetch hot suggestions:', e);
      } finally {
        setIsFetchingSuggestions(false);
      }
    };
    fetchHotSuggestionsInternal();

    try {
      await storageService.clearChat();
    } catch (e) {
      console.error('Failed to clear chat history:', e);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));
      
      history.push({ role: 'user', parts: [{ text: input }] });

      const systemInstruction = `${t.qaSystem} 
      Respond in ${settings.language === 'en' ? 'English' : settings.language === 'zh-TW' ? 'Traditional Chinese' : 'Simplified Chinese'}.`;

      const stream = await geminiService.chatStream(history, systemInstruction);

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      let fullContent = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        fullContent += chunkText;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullContent } : m));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t.error,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:pl-0 pl-14">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t.qa}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Gemini 3 Flash</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh} 
            className={cn("rounded-xl", isRefreshing && "animate-spin")}
            title={t.refresh}
          >
            <RefreshCw size={18} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 pr-4">
        <div className="space-y-6 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-muted-foreground">
                <MessageSquare size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{t.startChat}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-4">
                {(isFetchingSuggestions && hotSuggestions.length === 0 ? Array(4).fill('') : (hotSuggestions.length > 0 ? hotSuggestions : t.qaSuggestions)).map((suggestion, idx) => (
                  <Button 
                    key={suggestion || idx} 
                    variant="outline" 
                    className={cn(
                      "text-xs h-auto py-2.5 px-3 justify-start text-left overflow-hidden transition-all duration-300",
                      isFetchingSuggestions && "opacity-50"
                    )}
                    onClick={() => suggestion && setInput(suggestion)}
                    disabled={isFetchingSuggestions}
                  >
                    {isFetchingSuggestions && !suggestion ? (
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    ) : (
                      <span className="truncate w-full">{suggestion}</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4 group",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-blue-500/10 text-blue-600"
              )}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn(
                "flex flex-col max-w-[80%]",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                <Card className={cn(
                  "px-4 py-3 shadow-sm",
                  message.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card rounded-tl-none"
                )}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                </Card>
                <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Bot size={16} />
              </div>
              <div className="flex items-center gap-1 px-4 py-3 bg-card rounded-xl rounded-tl-none shadow-sm">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1], delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1], delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="mt-4 relative">
        <div className="flex items-center gap-2 p-2 bg-card border rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.chatPlaceholder}
            className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-xl px-3"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          {t.aiDisclaimer}
        </p>
      </div>
    </div>
  );
}
