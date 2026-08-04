import React, { useRef, useState } from 'react';
import { Paperclip, Smile, Send } from 'lucide-react';

interface ChatInputBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSend: (e?: React.FormEvent) => void;
  t: {
    attachFile: string;
    typeMessage: string;
    emoji: string;
    send: string;
  };
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  inputText,
  setInputText,
  handleSend,
  t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojis = ['👍', '❤️', '😊', '🙏', '✅', '🔥', '💼', '📍', '🤝'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setInputText(`[Fayl: ${fileName}] `);
      window.dispatchEvent(new CustomEvent("global-toast", { detail: `${fileName} biriktirildi` }));
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText(inputText + emoji);
    setShowEmoji(false);
  };

  return (
    <footer className="sticky bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-4 py-3 z-30">
      <div className="w-full max-w-5xl mx-auto flex items-center gap-3 relative">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          type="button"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-brand-text-variant shadow-xs hover:bg-slate-50 transition-all cursor-pointer border-0 shrink-0"
          title={t.attachFile}
        >
          <Paperclip size={18} />
        </button>

        <form onSubmit={handleSend} className="flex-1 relative flex items-center">
          <input
            type="text"
            className="w-full bg-white text-brand-text font-sans rounded-full py-3 px-5 pr-12 shadow-xs border-0 focus:outline-none transition-all placeholder:text-brand-outline text-xs font-semibold h-11"
            placeholder={t.typeMessage}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            onClick={() => setShowEmoji(!showEmoji)} 
            type="button"
            className="absolute right-4 text-brand-outline hover:text-brand-primary transition-colors cursor-pointer"
            title={t.emoji}
          >
            <Smile size={18} />
          </button>
        </form>

        {showEmoji && (
          <div className="absolute right-16 bottom-14 bg-white border border-slate-200 rounded-2xl shadow-lg p-2.5 flex items-center gap-1.5 z-50">
            {emojis.map((em, idx) => (
              <button key={idx} onClick={() => addEmoji(em)} className="p-1.5 hover:bg-slate-100 rounded-lg text-base cursor-pointer">
                {em}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => handleSend()}
          type="button"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-md hover:shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border-0 outline-none"
          title={t.send}
        >
          <Send size={18} className="translate-x-0.5" />
        </button>
      </div>
    </footer>
  );
};
