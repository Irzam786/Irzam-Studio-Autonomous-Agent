import React, { useState } from 'react';
import { 
  X, 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  ExternalLink, 
  Share2, 
  Code, 
  Copy, 
  Check, 
  Globe,
  Sparkles,
  Eye
} from 'lucide-react';
import { HostedDemo } from '../types';

interface SandboxModalProps {
  demo: HostedDemo | null;
  onClose: () => void;
}

export const SandboxModal: React.FC<SandboxModalProps> = ({ demo, onClose }) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!demo) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(demo.htmlContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + demo.previewUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col">
      {/* Top Bar */}
      <header className="h-14 border-b border-white/10 bg-zinc-950 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{demo.title}</span>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                {demo.deployTarget === 'netlify' ? 'Netlify Live Edge' : 'Live Edge Sandbox'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Client: <span className="text-zinc-200">{demo.clientName}</span> · URL: <span className="text-emerald-300 font-mono">{demo.liveNetlifyUrl || demo.previewUrl || '/demo/...'}</span>
            </div>
          </div>
        </div>

        {/* Center: Device Mode & View Switchers */}
        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setDeviceMode('desktop')}
                title="Desktop View (100%)"
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  deviceMode === 'desktop' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                title="Tablet View (768px)"
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  deviceMode === 'tablet' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                title="Mobile View (375px)"
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  deviceMode === 'mobile' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-md transition cursor-pointer font-medium ${
                activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Interactive Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md transition cursor-pointer font-medium ${
                activeTab === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Source HTML
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <button
              onClick={() => setIframeKey((prev) => prev + 1)}
              title="Reload sandbox"
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {activeTab === 'code' ? (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy HTML'}</span>
            </button>
          ) : (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Public Link'}</span>
            </button>
          )}

          {(demo.liveNetlifyUrl || demo.previewUrl) && (
            <a
              href={demo.liveNetlifyUrl || demo.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{demo.deployTarget === 'netlify' ? 'Open Netlify URL' : 'Open Standalone'}</span>
            </a>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Sandbox Canvas */}
      <div className="flex-1 bg-[#050508] p-4 flex items-center justify-center overflow-auto">
        {activeTab === 'preview' ? (
          <div className={`${getContainerWidth()} h-full transition-all duration-300 flex flex-col rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-black`}>
            {deviceMode !== 'desktop' && (
              <div className="bg-zinc-900 px-4 py-2 text-center text-[11px] font-mono text-zinc-400 border-b border-white/10 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Emulating {deviceMode.toUpperCase()} viewport</span>
              </div>
            )}
            <iframe
              key={iframeKey}
              srcDoc={demo.htmlContent}
              title={demo.title}
              className="w-full flex-1 bg-white border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        ) : (
          <div className="w-full max-w-5xl h-full flex flex-col bg-zinc-950 rounded-xl border border-white/15 overflow-hidden">
            <div className="p-3 bg-zinc-900/80 border-b border-white/10 flex justify-between items-center text-xs">
              <span className="font-mono text-zinc-400">HTML5 + Tailwind CSS (Render Code)</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-xs cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied to clipboard' : 'Copy code'}</span>
              </button>
            </div>
            <pre className="flex-1 p-4 font-mono text-xs text-zinc-300 overflow-auto whitespace-pre leading-relaxed select-text">
              <code>{demo.htmlContent}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
