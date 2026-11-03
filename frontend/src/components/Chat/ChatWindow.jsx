import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  Sparkles,
  Paperclip,
  Copy,
  Check,
  CornerDownLeft,
  ArrowUp,
  Brain,
  Lightbulb,
  Newspaper,
  FileText,
  X
} from 'lucide-react';
import { CitationBadge } from './CitationBadge';
import { ReasoningAccordion } from './ReasoningAccordion';
import { MarkdownRenderer } from './MarkdownRenderer';
import { WelcomeHero } from './WelcomeHero';

export function ChatWindow({
  messages: externalMessages,
  setMessages: externalSetMessages,
  onOpenHistory,
  isOnline,
  currentLanguage,
  t,
  agenticMode = true,
  onOpenQuickTips,
  onToggleNews,
  isNewsOpen
}) {
  const [internalMessages, setInternalMessages] = useState([]);
  const messages = externalMessages !== undefined ? externalMessages : internalMessages;
  const setMessages = externalSetMessages || setInternalMessages;
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveReasoningText, setLiveReasoningText] = useState('');
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: file.size,
        base64: reader.result,
        preview: file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp)$/i) ? reader.result : null
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, liveReasoningText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectSuggestion = (suggestedPrompt) => {
    setInput(suggestedPrompt);
    // Submit query
    setTimeout(() => {
      submitQuery(suggestedPrompt);
    }, 50);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    submitQuery(input);
  };

  const submitQuery = async (queryText) => {
    const query = (queryText || '').trim();
    if ((!query && !attachedFile) || isStreaming) return;

    const fileToSend = attachedFile;
    setAttachedFile(null);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setEmergencyAlert(null);
    setLiveReasoningText('');

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    // 1. Append user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: query || (fileToSend ? `Attached document: ${fileToSend.name}` : ''),
        file: fileToSend ? { name: fileToSend.name, type: fileToSend.type, preview: fileToSend.preview } : null,
        timestamp: new Date()
      }
    ]);

    setIsStreaming(true);

    // 2. Placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        citations: [],
        reactSteps: [],
        timestamp: new Date()
      }
    ]);

    try {
      const response = await fetch('/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg: query,
          language: currentLanguage,
          agentic: agenticMode,
          file_data: fileToSend?.base64,
          file_name: fileToSend?.name,
          file_type: fileToSend?.type
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in to consult with Medi-Assist.');
        }
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let citations = [];
      let reactSteps = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') break;

            try {
              const parsed = JSON.parse(rawData);

              // 1. Live ReAct Thought/Action/Observation Steps
              if (parsed.react_step) {
                reactSteps = [...reactSteps, parsed.react_step];
                setLiveReasoningText(parsed.react_step.text);
              }

              // 2. Full History of Steps
              if (parsed.react_history) {
                reactSteps = parsed.react_history;
              }

              // 3. Streaming Response Token
              if (parsed.token) {
                assistantText += parsed.token;
                setLiveReasoningText('');
              }

              // 4. Verification Citations
              if (parsed.citations) {
                citations = parsed.citations;
              }

              // 5. Emergency Red-Flag Triage Banner
              if (parsed.emergency_triage) {
                setEmergencyAlert(parsed.emergency_triage);
              }

              // Update the assistant message in place
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: assistantText, citations, reactSteps }
                    : m
                )
              );
            } catch (err) {
              // Plain text stream fallback
              assistantText += rawData;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: assistantText } : m
                )
              );
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  "I apologize, but I could not connect to the health assistant service. Please check your local server or network connection."
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      setLiveReasoningText('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-obsidian-950 relative overflow-hidden">
      {/* Top Right Quick Actions (Icon buttons only) */}
      <div className="absolute top-3.5 right-4 z-20 flex items-center gap-2">
        {onOpenQuickTips && (
          <button
            type="button"
            onClick={onOpenQuickTips}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm hover:border-amber-300 dark:hover:border-amber-700/60 transition-all cursor-pointer"
            title="Quick Tips"
          >
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </button>
        )}

        {onToggleNews && (
          <button
            type="button"
            onClick={onToggleNews}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border shadow-xs transition-all cursor-pointer ${
              isNewsOpen
                ? 'bg-indigo-50/95 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'bg-white/95 dark:bg-obsidian-900/95 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
            title="Live Health News"
          >
            <Newspaper className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Emergency Triage Banner */}
      {emergencyAlert && (
        <div className="bg-red-600 text-white p-3 px-5 flex items-center justify-between text-xs shadow-md animate-pulse z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
            <span className="font-semibold text-xs md:text-sm">{emergencyAlert}</span>
          </div>
          <a
            href="tel:112"
            className="px-3 py-1 bg-white text-red-700 font-bold rounded-lg shadow-sm hover:bg-red-50 text-xs shrink-0"
          >
            Emergency 112 / 911
          </a>
        </div>
      )}

      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-36 space-y-6 scroll-smooth">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {/* Welcome Hero when no messages */}
          {messages.length === 0 && (
            <WelcomeHero onSelectSuggestion={handleSelectSuggestion} />
          )}

          {/* Messages List */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {/* Message Body Card */}
                <div
                  className={`relative ${
                    isUser
                      ? 'max-w-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-sm'
                      : 'flex-1 max-w-3xl bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 rounded-2xl rounded-tl-xs p-5 shadow-xs text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {/* ReAct Trace Accordion (Assistant only) */}
                  {!isUser && msg.reactSteps && msg.reactSteps.length > 0 && (
                    <ReasoningAccordion
                      steps={msg.reactSteps}
                      isLive={isStreaming && !msg.content}
                    />
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <div>
                      {msg.file && (
                        <div className="mb-2.5 p-2 rounded-xl bg-white/15 border border-white/20 flex items-center gap-2.5 text-xs">
                          {msg.file.preview ? (
                            <img src={msg.file.preview} alt="Attachment" className="w-10 h-10 rounded-lg object-cover border border-white/30 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="min-w-0 truncate">
                            <span className="font-bold block truncate text-xs">{msg.file.name}</span>
                            <span className="text-[10px] opacity-85 block">{msg.file.type.includes('pdf') ? 'Digital PDF Lab Report' : 'Prescription / Medical Image'}</span>
                          </div>
                        </div>
                      )}
                      <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap font-normal">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-1 italic">
                          <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Generating evidence-based response...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verification Citations Accordion */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <CitationBadge citations={msg.citations} />
                  )}

                  {/* Action Toolbar (Copy button & Source Badge) */}
                  {!isUser && msg.content && (
                    <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        {msg.citations?.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {msg.citations.length} Verified Sources
                          </span>
                        )}
                        {agenticMode && (
                          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <Brain className="w-3 h-3" />
                            ReAct Verified
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Copy Response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Live Status Indicator Bar */}
          {isStreaming && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pl-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span className="font-medium text-indigo-700 dark:text-indigo-300 truncate">
                {liveReasoningText
                  ? `⚡ ${liveReasoningText}`
                  : "Consulting 19,712 medical reference vectors and preparing your explanation..."}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sleek Floating ChatGPT / Claude / Gemini style Input Pill */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none pb-3 pt-12 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-obsidian-950 dark:via-obsidian-950/90 flex flex-col items-center px-4 z-10">
        <div className="pointer-events-auto w-full max-w-2xl sm:max-w-3xl flex flex-col items-center">
          
          {/* File Attachment Preview Banner */}
          {attachedFile && (
            <div className="w-full mb-2 p-2 px-3 rounded-2xl bg-white dark:bg-obsidian-850 border border-indigo-200 dark:border-indigo-800 shadow-md flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                {attachedFile.preview ? (
                  <img src={attachedFile.preview} alt="Attachment" className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/40">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">{attachedFile.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {(attachedFile.size / 1024).toFixed(1)} KB • {attachedFile.type.startsWith('image/') ? 'Prescription / Medical Image' : 'Digital PDF Lab Report'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="w-full bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-700/80 rounded-[26px] shadow-lg shadow-black/[0.04] dark:shadow-black/25 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all flex items-end gap-1.5 p-1.5 pl-3 sm:pl-3.5">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Attach lab report (PDF) or prescription photo (JPG/PNG)"
              className="p-2 mb-0.5 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
              placeholder={
                attachedFile
                  ? "Add a note/question about this document (or press Send)..."
                  : t('ask_placeholder', "Ask about symptoms, diseases, causes, or medical conditions...")
              }
              className="flex-1 bg-transparent border-none text-[14px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none min-h-[38px] max-h-36 py-2 leading-relaxed"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isStreaming}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shrink-0 disabled:opacity-30 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 mb-0.5 mr-0.5 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Minimal Educational Disclaimer beneath input */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center select-none pt-2 tracking-tight">
            Medi-Assist provides evidence-based educational insights to help you understand health conditions and diseases.
          </p>
        </div>
      </div>
    </div>
  );
}
