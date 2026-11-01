import React, { useState } from 'react';
import { ChatMessage } from '../types/index.ts';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface ReviewChatProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => Promise<void>;
  isSending: boolean;
  reviewTitle: string;
}

const QUICK_QUESTIONS = [
  'Can you explain how this vulnerability could be exploited?',
  'What unit tests should I write to prevent regression?',
  'Is there any performance impact with the suggested fix?',
  'How does this adhere to Clean Code guidelines?',
];

export const ReviewChat: React.FC<ReviewChatProps> = ({
  messages,
  onSendMessage,
  isSending,
  reviewTitle,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const msg = input.trim();
    setInput('');
    await onSendMessage(msg);
  };

  const handleQuickQuestion = async (q: string) => {
    if (isSending) return;
    await onSendMessage(q);
  };

  return (
    <div className="flex flex-col h-[560px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/src/assets/images/avatar_bot_reviewer_1793543567657.jpg"
            alt="AI Reviewer"
            className="w-7 h-7 rounded-full object-cover border border-indigo-500/30"
          />
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              CodeRefine AI Discussion
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
              Context: {reviewTitle}
            </p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 dark:text-slate-400">
            <Bot className="w-8 h-8 text-indigo-500 mb-2 opacity-80" />
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Have questions about this review?
            </p>
            <p className="text-[11px] max-w-xs mb-4">
              Ask CodeRefine AI why specific issues were flagged, request alternative implementations, or get unit test scaffolds.
            </p>
            <div className="flex flex-col gap-1.5 w-full max-w-xs text-left">
              {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-[11px] text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isBot = m.sender === 'assistant';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <img
                    src="/src/assets/images/avatar_bot_reviewer_1793543567657.jpg"
                    alt="Bot"
                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                  />
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    isBot
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
                {!isBot && (
                  <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                    ME
                  </div>
                )}
              </div>
            );
          })
        )}
        {isSending && (
          <div className="flex gap-2.5 items-center text-slate-500 text-xs">
            <img
              src="/src/assets/images/avatar_bot_reviewer_1793543567657.jpg"
              alt="Bot"
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150" />
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a technical question about this code..."
          disabled={isSending}
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
