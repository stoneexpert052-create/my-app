'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  RefreshCw, 
  Bot, 
  User, 
  Trash2, 
  ShieldCheck,
  CheckCircle2,
  Camera,
  ImagePlus,
  X
} from 'lucide-react';
import { ActionConfirmationCard } from './action-confirmation-card';
import type { AdminActionProposal } from '@/app/api/admin-ai/chat/route';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  imagePreview?: string;
  actionProposal?: AdminActionProposal | null;
  timestamp: string;
  executedMessage?: string;
}

interface ChatInterfaceProps {
  className?: string;
  compact?: boolean;
}

export function AdminAiChatInterface({ className = '', compact = false }: ChatInterfaceProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        content: `**السلام علیکم!** میں **Stone Expert AI Operations Manager** ہوں۔\n\nآپ مجھے اپنی زبان (اردو یا انگریزی) میں کسی بھی کام کا حکم دے سکتے ہیں:\n* 📸 **سپلائر کی ریٹ لسٹ کی تصویر (Rate Sheet Photo)** اپلوڈ کریں اور بتائیں کہ یہ کس سپلائر کی ہے — میں پوری فہرست پڑھ کر **اسٹاک مینجمنٹ میں اس سپلائر کے ریٹس** اور **پوری ایپ کے کسٹمر ریٹس** ایک ساتھ اپ ڈیٹ کر دوں گا!\n* کسی ماربل یا کیمیکل کا **ریٹ تبدیل کرنا** یا **بلک ڈسکاؤنٹ** لگانا\n* کسی پروڈکٹ کو **In Stock یا Out of Stock** کرنا\n\n⚠️ **حفاظتی طریقہ کار (Safety Gate):** کوئی بھی ریٹ تبدیل کرنے سے پہلے میں آپ کو مکمل فہرست دکھا کر **اوکے / تائید (Confirm)** طلب کروں گا۔`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ur-PK' | 'en-US'>('ur-PK');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string>('image/jpeg');
  const [selectedImageName, setSelectedImageName] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Web Speech API Voice Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLang;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [speechLang]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser does not support Web Speech Recognition.",
        variant: "destructive"
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'صرف تصویر منتخب کریں',
        description: 'براہ کرم سپلائر کی ریٹ لسٹ کی تصویر (JPG, PNG, WebP) اپلوڈ کریں۔',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImageBase64(result);
      setSelectedImageMime(file.type || 'image/jpeg');
      setSelectedImageName(file.name);
      if (!input.trim()) {
        setInput('یہ ریٹ لسٹ المجید ماربل فیکٹری کی ہے، اس کے حساب سے سپلائر اور پوری ایپ کے ریٹس اپ ڈیٹ کر دیں۔');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearSelectedImage = () => {
    setSelectedImageBase64(null);
    setSelectedImageName('');
  };

  const sendMessage = async (promptText?: string) => {
    const textToSend = (promptText !== undefined ? promptText : input).trim();
    if ((!textToSend && !selectedImageBase64) || loading) return;

    const currentImage = selectedImageBase64;
    const currentMime = selectedImageMime;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend || '📸 سپلائر ریٹ لسٹ کی تصویر اپلوڈ کی گئی',
      imagePreview: currentImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (promptText === undefined) setInput('');
    setSelectedImageBase64(null);
    setSelectedImageName('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'msg-welcome')
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/admin-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: historyPayload,
          language: 'ur',
          imageBase64: currentImage || undefined,
          imageMimeType: currentImage ? currentMime : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from AI');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: data.reply || 'یہ لیں، آپ کی ہدایت کے مطابق تفصیل تیار ہے۔',
        actionProposal: data.actionProposal || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast({
        title: "AI کنکشن ایرر",
        description: err.message || "جواب حاصل کرنے میں مسئلہ پیش آیا۔",
        variant: "destructive"
      });
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `⚠️ **معذرت!** سسٹم سے رابطہ کرنے میں دشواری پیش آئی: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionExecuted = (msgId: string, result: { success: boolean; messageUr?: string; messageEn?: string }) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? { ...m, executedMessage: result.messageUr || result.messageEn || 'تبدیلی کامیابی سے نافذ ہو گئی!' }
          : m
      )
    );

    toast({
      title: "ڈیٹا بیس اپڈیٹ ہو گیا!",
      description: result.messageUr || result.messageEn || "آپ کی تصدیق کے بعد تبدیلی محفوظ کر لی گئی ہے۔"
    });
  };

  const quickPrompts = [
    {
      label: "📸 ریٹ لسٹ تصویر اپلوڈ کریں",
      isUploadTrigger: true,
      prompt: ""
    },
    {
      label: "المجید فیکٹری کے ریٹس ایپ پر لاگو کریں",
      prompt: "المجید ماربل اینڈ گرینائٹ فیکٹری کی ریٹ لسٹ کے حساب سے پوری ایپ کے ریٹس اپ ڈیٹ کر دیں۔"
    },
    {
      label: "زیارت وائٹ کا ریٹ بڑھاؤ",
      prompt: "زیارت وائٹ ماربل کا ریٹ بڑھا کر 450 روپے فی مربع فٹ کر دو"
    },
    {
      label: "10% سیل لگاؤ",
      prompt: "تمام ماربلز پر 10 فیصد سیل لگا دو"
    }
  ];

  return (
    <div className={`flex flex-col bg-background border rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Hidden File Input for Supplier Rate Sheet Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Top Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/80">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 shadow-inner">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white">
                StoneBot AI Operations Manager
              </h3>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] px-1.5 py-0">
                Gemini Vision + OCR
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>سپلائر ریٹ لسٹ اسکینر اور مکمل ایپ ریٹ کنٹرول (تصدیق کے ساتھ)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 gap-1"
            title="Upload Supplier Rate List Image"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ریٹ لسٹ فوٹو</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSpeechLang(prev => (prev === 'ur-PK' ? 'en-US' : 'ur-PK'))}
            className="h-7 px-2 text-[10px] font-bold text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700"
            title="Switch Voice Recognition Language"
          >
            🎤 {speechLang === 'ur-PK' ? 'اردو' : 'EN'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setMessages([
                {
                  id: 'msg-welcome',
                  role: 'model',
                  content: `**چیٹ ری سیٹ کر دی گئی ہے۔** آپ کسی بھی سپلائر کی ریٹ لسٹ کی تصویر اپلوڈ کر سکتے ہیں یا نیا حکم دے سکتے ہیں۔`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ])
            }
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Clear Chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-muted-foreground shrink-0 px-1">
          فوری کمانڈز:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={() => {
              if (qp.isUploadTrigger) {
                fileInputRef.current?.click();
              } else {
                sendMessage(qp.prompt);
              }
            }}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors shrink-0 flex items-center gap-1 ${
              qp.isUploadTrigger
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-500/25'
                : 'bg-background hover:bg-amber-500/10 hover:border-amber-500/40 text-foreground'
            }`}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          compact ? 'max-h-[420px] min-h-[320px]' : 'min-h-[460px] max-h-[620px]'
        }`}
      >
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                  isUser
                    ? 'bg-primary text-primary-foreground border-primary/40'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={`flex flex-col max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted/70 text-foreground border border-border/60 rounded-tl-none'
                  }`}
                  dir="auto"
                >
                  {msg.imagePreview && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/20 max-w-[240px]">
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded Supplier Rate Sheet"
                        className="w-full h-auto max-h-48 object-contain bg-black/20"
                      />
                    </div>
                  )}
                  <div className="markdown-body space-y-1.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Action Confirmation Card */}
                {msg.actionProposal && (
                  <div className="w-full mt-1">
                    <ActionConfirmationCard
                      proposal={msg.actionProposal}
                      onExecuted={res => handleActionExecuted(msg.id, res)}
                      language="ur"
                    />
                  </div>
                )}

                {/* Execution Receipt Banner */}
                {msg.executedMessage && (
                  <div
                    className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                    dir="auto"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{msg.executedMessage}</span>
                  </div>
                )}

                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-600 border border-amber-500/30">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-muted/60 border text-xs text-muted-foreground flex items-center gap-2">
              <span>AI ریٹ لسٹ پڑھ رہا ہے اور ڈیٹا بیس چیک کر رہا ہے...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Rate Sheet Image Preview Bar */}
      {selectedImageBase64 && (
        <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={selectedImageBase64}
              alt="Preview"
              className="h-10 w-10 rounded-lg object-cover border border-amber-500/40 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                📸 ریٹ لسٹ تصویر منسلک ہے ({selectedImageName || 'Rate Sheet'})
              </p>
              <p className="text-[10px] text-muted-foreground">
                نیچے سپلائر کا نام لکھ کر Send دبائیں (مثلاً: یہ المجید فیکٹری کی ریٹ لسٹ ہے)
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelectedImage}
            className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 bg-muted/30 border-t flex items-center gap-2"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className={`shrink-0 rounded-xl h-10 w-10 ${
            selectedImageBase64
              ? 'border-amber-500 bg-amber-500/15 text-amber-600'
              : 'hover:border-amber-500/50 hover:text-amber-600'
          }`}
          title="سپلائر کی ریٹ لسٹ کی تصویر اپلوڈ کریں (Upload Rate Sheet Image)"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={toggleRecording}
          className={`shrink-0 rounded-xl h-10 w-10 ${isRecording ? 'animate-pulse' : ''}`}
          title="بول کر ہدایت دیں (Voice Input)"
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="ریٹ لسٹ تصویر اپلوڈ کریں یا حکم لکھیں (مثلاً: یہ ریٹ فلاں سپلائر کے ہیں، اپ ڈیٹ کر دیں)..."
          disabled={loading}
          dir="auto"
          className="h-10 rounded-xl text-xs sm:text-sm bg-background"
        />

        <Button
          type="submit"
          disabled={loading || (!input.trim() && !selectedImageBase64)}
          className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 gap-1.5"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">بھیجیں</span>
        </Button>
      </form>
    </div>
  );
}
