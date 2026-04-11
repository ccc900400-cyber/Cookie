export type AgentType = 'analysis' | 'qa' | 'minutes';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: FileInfo[];
}

export interface FileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  analysisResult?: string;
  file?: File;
}

export interface AppSettings {
  language: 'zh-CN' | 'zh-TW' | 'en';
  theme: 'light' | 'dark' | 'eye-protection';
}
