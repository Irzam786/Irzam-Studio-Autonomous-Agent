import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Paperclip, 
  FileText, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Globe, 
  Clock, 
  ChevronRight,
  Share2,
  Mail,
  Eye,
  FileCode,
  Square,
  RotateCcw,
  Sparkles,
  Zap
} from 'lucide-react';
import { ChatMessage, ChatAttachment, HostedDemo, ChatSession, ActivityStage } from '../types';
import { formatBytes, formatTimeRemaining } from '../utils/formatters';

export const IRZAM_MODELS = [
  { id: 'Qwen 3.8 Max', label: 'Qwen 3.8 Max', category: 'Reasoning' },
  { id: 'Qwen Omni', label: 'Qwen Omni', category: 'Multimodal' },
  { id: 'Qwen 2.5 Coder 32B', label: 'Qwen 2.5 Coder 32B', category: 'Coding' },
  { id: 'Qwen 2.5 72B Instruct', label: 'Qwen 2.5 72B Instruct', category: 'General' },
  { id: 'Qwen 2.5 14B Fast', label: 'Qwen 2.5 14B Fast', category: 'Fast' },
  { id: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash', category: 'Backup' },
];

export const SPY18_MODELS = IRZAM_MODELS;

interface ChatWorkspaceProps {
  session: ChatSession | null;
  onSendMessage: (content: string, attachments: ChatAttachment[], model: string, autoRoute: boolean) => Promise<void>;
  isGenerating: boolean;
  activityStage?: ActivityStage;
  activityLabel?: string;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  onOpenSandbox: (demo: HostedDemo) => void;
  onOpenComposeWithDemo?: (demo: HostedDemo) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  isAutoModel: boolean;
  onToggleAutoModel: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  session,
  onSendMessage,
  isGenerating,
  activityStage = 'idle',
  activityLabel = 'Generating response...',
  onStopGeneration,
  onRegenerate,
  onOpenSandbox,
  onOpenComposeWithDemo,
  selectedModel,
  onModelChange,
  isAutoModel,
  onToggleAutoModel,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages, isGenerating, activityLabel]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          const newAtt: ChatAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result as string,
            previewUrl: reader.result as string,
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const content = reader.result as string;
          const newAtt: ChatAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            data: content,
            textPreview: content.slice(0, 3000),
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsText(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async () => {
    if ((!inputText.trim() && attachments.length === 0) || isGenerating) return;
    const textToSend = inputText;
    const attsToSend = [...attachments];
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await onSendMessage(textToSend, attsToSend, selectedModel, isAutoModel);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyLiveLink = (url: string, id: string) => {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const promptSuggestions = [
    {
      title: 'Deploy Institutional Wealth Prototype',
      prompt: 'Deploy an institutional wealth portfolio prototype with dark obsidian background, live treasury allocations, and partner meeting booking.',
    },
    {
      title: '5 PM Lead Qualification Review',
      prompt: 'Check candidate businesses in Chicago with >= 50 Google reviews and review their website status for outreach.',
    },
    {
      title: 'Executive Outreach Draft (<140 words)',
      prompt: 'Draft an executive B2B outreach email for Apex Capital pitching a custom algorithmic treasury dashboard prototype.',
    },
    {
      title: 'Review Active Training Rules',
      prompt: 'Summarize all active operational rules learned from personal training and how they apply to today’s campaigns.',
    },
  ];

  const messages = session?.messages || [];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#07070a] relative overflow-hidden text-zinc-100 font-sans">
      {/* Scrollable Conversation Workspace (ChatGPT Centered Reading Column) */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12 md:py-20 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.18)]">
                <span className="text-2xl text-white font-sans select-none">✦</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
                What shall we automate today?
              </h1>
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Irzam Studio intelligence standing by. Deploy client website prototypes, research Google business leads, or manage autonomous email outreach.
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
              {promptSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(item.prompt)}
                  className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/[0.08] hover:border-white/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-200 group-hover:text-white mb-1">
                    <span>{item.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageItem
              key={message.id || idx}
              message={message}
              isLast={idx === messages.length - 1}
              copiedId={copiedId}
              copiedLinkId={copiedLinkId}
              onCopy={copyToClipboard}
              onCopyLink={copyLiveLink}
              onOpenSandbox={onOpenSandbox}
              onOpenComposeWithDemo={onOpenComposeWithDemo}
              onPreviewImage={(url) => setPreviewModalImage(url)}
              onRegenerate={onRegenerate}
            />
          ))
        )}

        {/* ChatGPT Style 3-Dot Animation with Accurate Activity Stages */}
        {isGenerating && (
          <div className="flex items-start gap-3.5 max-w-3xl mx-auto py-2">
            <div className="w-7 h-7 rounded-lg bg-black border border-white/20 flex items-center justify-center flex-shrink-0 text-white text-xs shadow-sm mt-0.5">
              ✦
            </div>
            <div className="space-y-1.5 text-xs text-zinc-300">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce"></span>
                </div>
                <span className="font-semibold text-zinc-200 text-xs font-mono">
                  {activityLabel || 'Irzam Studio thinking...'}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono block">
                {isAutoModel ? 'Dynamic Auto-Routing' : selectedModel}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Stop Button if generating */}
      {isGenerating && onStopGeneration && (
        <div className="flex justify-center -mb-2 relative z-30">
          <button
            onClick={onStopGeneration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-xs text-zinc-200 hover:text-white shadow-xl transition cursor-pointer"
          >
            <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
            <span>Stop Generating</span>
          </button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewModalImage && (
        <div 
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={previewModalImage} 
              alt="Attachment Full View" 
              className="max-w-full max-h-[85vh] rounded-2xl border border-white/20 object-contain shadow-2xl" 
            />
            <button 
              onClick={() => setPreviewModalImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-900 border border-white/20 text-white flex items-center justify-center hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Composer Box */}
      <div className="p-3 md:p-4 border-t border-white/[0.08] bg-[#07070a]/95 backdrop-blur-2xl relative z-20">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* File Attachments Strip */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 group flex-shrink-0"
                >
                  {att.type.startsWith('image/') ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      onClick={() => setPreviewModalImage(att.previewUrl || '')}
                      className="w-5 h-5 rounded object-cover cursor-pointer border border-white/10"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className="truncate max-w-[140px] text-xs font-mono">{att.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({formatBytes(att.size)})</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-zinc-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea Composer Container */}
          <div className="relative rounded-2xl bg-zinc-900/80 border border-white/[0.12] focus-within:border-white/35 transition shadow-2xl shadow-black/80">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, deploy a client demo prototype, or draft outreach..."
              className="w-full bg-transparent px-4 pt-3.5 pb-13 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none min-h-[56px] max-h-[200px] leading-relaxed font-sans"
            />

            {/* Bottom Controls Bar */}
            <div className="absolute left-3 bottom-2.5 right-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.json,.md,.csv,.js,.ts,.html,.css"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="chat-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer border border-white/[0.08]"
                  title="Upload images, files, or dossiers"
                >
                  <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px] hidden sm:inline">Attach</span>
                </button>

                {/* Model Selector & Dedicated Auto Toggle */}
                <div className="flex items-center gap-1.5 bg-zinc-950/90 border border-white/10 rounded-xl px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={onToggleAutoModel}
                    title={
                      isAutoModel
                        ? 'Auto Mode ON: Agent dynamically picks the best model based on prompt'
                        : 'Auto Mode OFF: Strictly routing to selected model'
                    }
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                      isAutoModel
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAutoModel ? 'bg-black animate-pulse' : 'bg-zinc-500'}`}></span>
                    <span>Auto</span>
                  </button>
                  <span className="text-zinc-700 font-mono text-[10px]">|</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 focus:text-white focus:outline-none cursor-pointer pr-1 font-mono font-medium"
                  >
                    {IRZAM_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-950 text-white font-mono py-1">
                        {m.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Send or Stop Button */}
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <button
                    onClick={onStopGeneration}
                    title="Stop generation"
                    className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10"
                  >
                    <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() && attachments.length === 0}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
                      inputText.trim() || attachments.length > 0
                        ? 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-md shadow-white/15'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MessageItemProps {
  message: ChatMessage;
  isLast?: boolean;
  copiedId: string | null;
  copiedLinkId: string | null;
  onCopy: (text: string, id: string) => void;
  onCopyLink: (url: string, id: string) => void;
  onOpenSandbox: (demo: HostedDemo) => void;
  onOpenComposeWithDemo?: (demo: HostedDemo) => void;
  onPreviewImage: (url: string) => void;
  onRegenerate?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLast = false,
  copiedId,
  copiedLinkId,
  onCopy,
  onCopyLink,
  onOpenSandbox,
  onOpenComposeWithDemo,
  onPreviewImage,
  onRegenerate,
}) => {
  const isUser = message.role === 'user';
  const messageCopied = copiedId === message.id;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full group py-2`}>
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-zinc-500 font-mono">
        <span className="font-extrabold text-zinc-300 font-sans">{isUser ? 'Operative' : 'Irzam Studio'}</span>
        <span aria-hidden="true">·</span>
        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {!isUser && message.modelUsed && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400 font-mono text-[10px]">
              {message.modelUsed}
            </span>
          </>
        )}
      </div>

      {/* Message Content: Clean natural layout without bulky boxes */}
      <div
        className={`${
          isUser
            ? 'rounded-2xl px-4 py-2.5 bg-zinc-800/90 text-white border border-white/10 max-w-2xl'
            : 'w-full text-zinc-200 py-1'
        }`}
      >
        {/* Attached files strip */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-white/10 text-xs"
              >
                {att.type.startsWith('image/') ? (
                  <img
                    src={att.previewUrl || att.data}
                    alt={att.name}
                    onClick={() => onPreviewImage(att.previewUrl || att.data)}
                    className="w-12 h-12 rounded object-cover cursor-pointer border border-white/10 hover:opacity-90 transition"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
                <div className="text-left pr-2">
                  <div className="text-xs font-medium text-white truncate max-w-[160px] font-mono">{att.name}</div>
                  <div className="text-[10px] text-zinc-400 font-mono">{formatBytes(att.size)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ChatGPT Natural Markdown Body */}
        <div className="prose prose-invert max-w-none text-sm leading-relaxed overflow-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }: any) => (
                <h1 className="text-xl font-black text-white mt-4 mb-2 tracking-tight font-sans first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }: any) => (
                <h2 className="text-lg font-extrabold text-white mt-3.5 mb-2 tracking-tight font-sans first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }: any) => (
                <h3 className="text-base font-bold text-zinc-100 mt-3 mb-1.5 font-sans">
                  {children}
                </h3>
              ),
              p: ({ children }: any) => (
                <p className="mb-3 leading-relaxed text-zinc-200 last:mb-0">
                  {children}
                </p>
              ),
              ul: ({ children }: any) => (
                <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-200">
                  {children}
                </ul>
              ),
              ol: ({ children }: any) => (
                <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-200">
                  {children}
                </ol>
              ),
              li: ({ children }: any) => (
                <li className="leading-relaxed pl-1">{children}</li>
              ),
              blockquote: ({ children }: any) => (
                <blockquote className="border-l-2 border-white/40 pl-3.5 py-1 my-3 text-zinc-300 italic bg-white/[0.02] rounded-r">
                  {children}
                </blockquote>
              ),
              table: ({ children }: any) => (
                <div className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-black/40">
                  <table className="min-w-full divide-y divide-white/10 text-xs">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }: any) => (
                <thead className="bg-zinc-900/90">{children}</thead>
              ),
              tbody: ({ children }: any) => (
                <tbody className="divide-y divide-white/5">{children}</tbody>
              ),
              tr: ({ children }: any) => (
                <tr className="hover:bg-white/[0.02] transition">{children}</tr>
              ),
              th: ({ children }: any) => (
                <th className="px-3.5 py-2 text-left font-bold text-white uppercase text-[10px] tracking-wider font-mono">
                  {children}
                </th>
              ),
              td: ({ children }: any) => (
                <td className="px-3.5 py-2 text-zinc-300 leading-relaxed font-mono">
                  {children}
                </td>
              ),
              a: ({ href, children }: any) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition"
                >
                  {children}
                </a>
              ),
              strong: ({ children }: any) => (
                <strong className="font-bold text-white">{children}</strong>
              ),
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const isInline = !match && !codeString.includes('\n');

                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-xs border border-white/10">
                      {children}
                    </code>
                  );
                }

                const lang = match ? match[1] : '';
                const isHtml = lang === 'html' || lang === 'htm' || codeString.includes('<html') || codeString.includes('<body');

                return (
                  <div className="my-3.5 rounded-xl overflow-hidden bg-black/90 border border-white/10 shadow-lg">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/90 border-b border-white/[0.08] text-xs">
                      <span className="font-mono text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                        {lang || 'code'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isHtml && (
                          <button
                            onClick={() => {
                              const tempDemo: HostedDemo = {
                                id: `sandbox-${Date.now()}`,
                                slug: 'sandbox-code',
                                title: 'Live Sandbox Preview',
                                clientName: 'Client Review',
                                createdAt: new Date().toISOString(),
                                expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
                                framework: 'Tailwind + HTML',
                                status: 'active',
                                views: 1,
                                htmlContent: codeString,
                                previewUrl: '',
                                deployTarget: 'edge_sandbox',
                              };
                              onOpenSandbox(tempDemo);
                            }}
                            className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40"
                          >
                            <Play className="w-3 h-3" />
                            <span>Run in Sandbox</span>
                          </button>
                        )}
                        <button
                          onClick={() => onCopy(codeString, `code-${codeString.slice(0, 15)}`)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
                        >
                          {copiedId === `code-${codeString.slice(0, 15)}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed max-h-96">
                      <code>{codeString}</code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Live Client Demo Card if Attached */}
        {message.deployedDemo && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-black border border-emerald-500/30 shadow-lg shadow-emerald-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{message.deployedDemo.title}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {message.deployedDemo.deployTarget === 'netlify' ? 'Netlify Live Edge' : 'Live Sandbox'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span>Client: <strong className="text-zinc-200">{message.deployedDemo.clientName}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {formatTimeRemaining(message.deployedDemo.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 truncate">
                <span className="text-zinc-500">Live URL:</span>
                <span className="text-emerald-300 font-medium truncate max-w-[200px] sm:max-w-none">
                  {message.deployedDemo.liveNetlifyUrl || message.deployedDemo.previewUrl}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenSandbox(message.deployedDemo!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sandbox</span>
                </button>
                <a
                  href={message.deployedDemo.liveNetlifyUrl || message.deployedDemo.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Live URL</span>
                </a>
                <button
                  onClick={() => onCopyLink(message.deployedDemo?.liveNetlifyUrl || message.deployedDemo!.previewUrl, message.deployedDemo!.id)}
                  title="Copy public link"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer"
                >
                  {copiedLinkId === message.deployedDemo.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {onOpenComposeWithDemo && (
                  <button
                    onClick={() => onOpenComposeWithDemo(message.deployedDemo!)}
                    title="Send in outreach email"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 text-xs transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Email Prospect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assistant Message Actions Toolbar */}
      {!isUser && (
        <div className="flex items-center gap-2 mt-1 px-1 text-zinc-500 text-xs">
          <button
            onClick={() => onCopy(message.content, message.id)}
            className="flex items-center gap-1 hover:text-zinc-300 transition cursor-pointer py-1"
            title="Copy response"
          >
            {messageCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[11px]">Copy response</span>
              </>
            )}
          </button>
          {isLast && onRegenerate && (
            <>
              <span className="text-zinc-700">·</span>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 hover:text-zinc-300 transition cursor-pointer py-1"
                title="Regenerate response"
              >
                <RotateCcw className="w-3 h-3 text-zinc-400" />
                <span className="text-[11px]">Regenerate</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
