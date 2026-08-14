import React, { useRef, useState } from 'react';
import { Paperclip, Smile, Send } from 'lucide-react';
import type { AttachedFileData } from '../../hooks/useChatScreen';
import { EmojiPicker } from './EmojiPicker';

interface ChatInputBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  attachedFile?: AttachedFileData | null;
  setAttachedFile?: (file: AttachedFileData | null) => void;
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
  attachedFile,
  setAttachedFile,
  handleSend,
  t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (setAttachedFile) {
        setAttachedFile({ name: file.name, previewUrl });
      }
      window.dispatchEvent(new CustomEvent("global-toast", { detail: `${file.name} biriktirildi` }));
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    if (attachedFile && setAttachedFile) {
      URL.revokeObjectURL(attachedFile.previewUrl);
      setAttachedFile(null);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(inputText + emoji);
  };

  return (
    <footer className="sticky bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-0 py-0 z-30 relative">
      {/* Telegram-style Emoji Picker */}
      {showEmoji && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* Telegram-style Attachment Preview Bar */}
      {attachedFile && (
        <div className="w-full max-w-5xl mx-auto px-4 pt-3 pb-1 flex items-end gap-3 bg-white relative">
          <div className="relative">
            <div className="w-14 h-14 rounded-lg overflow-hidden shadow-sm bg-slate-50 border border-slate-200">
              <img 
                src={attachedFile.previewUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <button 
              type="button" 
              onClick={handleRemoveFile} 
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-500 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer z-10 hover:bg-slate-600 transition-colors border border-white"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1">
            {attachedFile.name.length > 20 ? attachedFile.name.substring(0, 20) + '...' : attachedFile.name}
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto flex items-end gap-2 px-4 pb-3 pt-2 relative bg-white">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,.doc,.docx" />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          type="button"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-brand-text-variant shadow-xs hover:bg-slate-50 transition-all cursor-pointer border-0 shrink-0"
          title={t.attachFile}
        >
          <Paperclip size={18} />
        </button>

        <form onSubmit={handleSend} className="flex-1 relative flex flex-col items-start w-full">
          <div className="w-full relative flex items-center">
            <input
              type="text"
              className="w-full bg-slate-50 text-brand-text font-sans rounded-full py-3 px-5 pr-12 border-none focus:outline-none transition-all placeholder:text-brand-outline text-xs font-semibold h-11"
              placeholder={t.typeMessage}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              onClick={() => setShowEmoji(!showEmoji)} 
              type="button"
              className={`absolute right-4 transition-colors cursor-pointer ${showEmoji ? 'text-brand-primary' : 'text-brand-outline hover:text-brand-primary'}`}
              title={t.emoji}
            >
              <Smile size={18} />
            </button>
          </div>
        </form>

        <button
          onClick={() => handleSend()}
          type="button"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-md hover:shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          title={t.send}
        >
          <Send size={18} className="translate-x-0.5" />
        </button>
      </div>
    </footer>
  );
};
