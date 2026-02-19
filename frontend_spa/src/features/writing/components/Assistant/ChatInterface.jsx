// FILE: src/components/Assistant/ChatInterface.jsx

import React, { useState, useRef, useEffect } from 'react';
import { 
    Send, Sparkles, Eraser, BookOpen, 
    CornerDownLeft, AlertTriangle, StopCircle
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.jsx'; 

const ChatInterface = () => {
  const { project, isPro, setShowUpgradeModal } = useProject();
  
  // Storage Keys Helper
  const getStorageKey = (pid) => `onthesis_chat_history_${pid}`;
  const getInputKey = (pid) => `onthesis_chat_input_${pid}`;

  // Default Message
  const defaultMsg = { 
    role: 'system', 
    content: `Ready. Context: **${project?.title || 'Untitled Project'}**.` 
  };

  // 1. INITIALIZE STATE DARI LOCAL STORAGE
  const [messages, setMessages] = useState(() => {
      if (!project?.id) return [defaultMsg];
      const saved = localStorage.getItem(getStorageKey(project.id));
      return saved ? JSON.parse(saved) : [defaultMsg];
  });

  const [input, setInput] = useState(() => {
      if (!project?.id) return '';
      return localStorage.getItem(getInputKey(project.id)) || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto Scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // Focus Input on Mount
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  // 2. AUTO SAVE EFFECT
  useEffect(() => {
      if (project?.id) {
          localStorage.setItem(getStorageKey(project.id), JSON.stringify(messages));
      }
  }, [messages, project?.id]);

  useEffect(() => {
      if (project?.id) {
          localStorage.setItem(getInputKey(project.id), input);
      }
  }, [input, project?.id]);

  // 3. HANDLE PROJECT SWITCH (Muat ulang data baru saat ganti project)
  useEffect(() => {
    if (!project?.id) return;
    
    const savedMsg = localStorage.getItem(getStorageKey(project.id));
    const savedInput = localStorage.getItem(getInputKey(project.id));

    if (savedMsg) {
        setMessages(JSON.parse(savedMsg));
    } else {
        setMessages([{ 
            role: 'system', 
            content: `Context switched to: **${project?.title || 'Untitled'}**` 
        }]);
    }
    
    setInput(savedInput || '');
  }, [project?.id]);

  // Handle Send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!isPro && messages.length > 20) { 
        const warningMsg = { 
            role: 'warning', 
            content: "Kuota chat gratis habis. Upgrade ke Pro untuk unlimited context aware chat." 
        };
        setMessages(prev => [...prev, warningMsg]);
        setShowUpgradeModal && setShowUpgradeModal(true);
        return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear input after send
    setIsLoading(true);

    try {
      const contextPayload = {
          title: project?.title,
          problem: project?.problem_statement,
          method: project?.methodology,
          variables: project?.variables_indicators
      };

      const recentHistory = messages.filter(m => m.role !== 'system' && m.role !== 'warning').slice(-6);

      const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: recentHistory, 
          context: JSON.stringify(contextPayload), 
          projectId: project?.id
        }),
      });

      if (!response.ok) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botResponse = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botResponse += chunk;
        
        // Update pesan terakhir secara realtime
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.role === 'assistant') lastMsg.content = botResponse;
          return newMsgs;
        });
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', content: 'Koneksi terputus. Coba lagi.', isError: true }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 4. CLEAR CHAT (Hapus juga dari Storage)
  const clearChat = () => {
      const resetMsg = [{ 
        role: 'system', 
        content: `Ready. Context: **${project?.title || 'Untitled Project'}**.` 
      }];
      setMessages(resetMsg);
      if(project?.id) localStorage.removeItem(getStorageKey(project.id));
  };

  return (
    // CONTAINER: Match dengan LexicalEditor (White / Dark #1E1E1E)
    <div className="flex flex-col h-full bg-white dark:bg-[#1E1E1E] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
        
        {/* HEADER */}
        <div className="flex justify-end items-center px-3 py-2 shrink-0 bg-transparent">
            <button 
                onClick={clearChat}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors" 
                title="Clear Chat History"
            >
                <Eraser size={14} />
            </button>
        </div>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isWarning = msg.role === 'warning';
                const isSystem = msg.role === 'system';
                const isAssistant = msg.role === 'assistant';

                if (isWarning) {
                    return (
                        <div key={idx} className="border border-yellow-500/30 bg-yellow-50 dark:bg-[#2D2B10] p-3 rounded-md flex gap-3 text-xs select-none">
                            <AlertTriangle size={14} className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="text-gray-700 dark:text-gray-200">{msg.content}</p>
                                <button 
                                    onClick={() => setShowUpgradeModal && setShowUpgradeModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-sm font-medium transition-colors"
                                >
                                    Upgrade Pro
                                </button>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}>
                        {/* USER MESSAGE */}
                        {isUser && (
                            <div className="bg-gray-100 dark:bg-[#2B2D31] text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md max-w-[90%] text-left border border-gray-200 dark:border-white/10 shadow-sm">
                                {msg.content}
                            </div>
                        )}

                        {/* AI / SYSTEM MESSAGE */}
                        {(isAssistant || isSystem) && (
                            <div className="flex gap-3 max-w-full">
                                {isAssistant && (
                                    <div className="w-5 h-5 rounded-sm bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                        <Sparkles size={10} className="text-white"/>
                                    </div>
                                )}
                                
                                <div className={`leading-6 text-[13px] ${isSystem ? 'text-gray-400 italic text-xs pl-1' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {msg.content.split('**').map((part, i) => 
                                        i % 2 === 1 ? <strong key={i} className="text-gray-900 dark:text-white font-semibold">{part}</strong> : part
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            
            {/* Loading Indicator */}
            {isLoading && (
                <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-sm bg-gray-200 dark:bg-[#2B2D31] flex items-center justify-center shrink-0 animate-pulse">
                       <Sparkles size={10} className="text-gray-400 dark:text-gray-500"/>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 italic text-xs mt-0.5">Thinking...</span>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-white dark:bg-[#1E1E1E] shrink-0 border-t border-gray-200 dark:border-white/5">
            <div className={`
                relative bg-gray-50 dark:bg-[#252526] border rounded-md transition-all flex flex-col group
                ${isLoading ? 'border-gray-300 dark:border-gray-700 opacity-70' : 'border-gray-300 dark:border-[#3C3C3C] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20'}
            `}>
                
                {/* CONTEXT PILL */}
                {project?.title && (
                    <div className="px-2 pt-2 pb-0 flex gap-2 overflow-hidden">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#2D2D2D] text-gray-600 dark:text-gray-300 text-[10px] px-1.5 py-0.5 rounded-sm border border-gray-200 dark:border-white/10 shrink-0 max-w-full shadow-sm">
                            <BookOpen size={10} className="text-blue-500 dark:text-blue-400"/>
                            <span className="truncate">{project.title}</span>
                        </div>
                    </div>
                )}

                {/* TEXT AREA */}
                <form onSubmit={handleSendMessage} className="flex-1">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                        placeholder="Ketik instruksi atau pertanyaan..."
                        className="w-full bg-transparent text-gray-800 dark:text-gray-200 text-[13px] px-3 py-2 focus:outline-none resize-none min-h-[48px] max-h-32 placeholder-gray-400 custom-scrollbar"
                        disabled={isLoading}
                    />
                    
                    {/* BOTTOM TOOLBAR */}
                    <div className="flex justify-between items-center px-2 pb-1.5 pt-0">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                {isPro ? "PRO" : "BASIC"}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={!input.trim() && !isLoading}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${
                                isLoading ? 'text-gray-400 cursor-wait' : 'text-blue-600 dark:text-white'
                            }`}
                            title="Kirim (Enter)"
                        >
                            {isLoading ? <StopCircle size={14} className="animate-pulse"/> : <CornerDownLeft size={14} strokeWidth={2.5} />}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="text-center mt-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-600">
                    AI generated content. Check for mistakes.
                </p>
            </div>
        </div>
    </div>
  );
};

export default ChatInterface;