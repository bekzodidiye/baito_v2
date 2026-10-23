import React, { useRef, useState } from 'react';
import { Paperclip, Smile, Send } from 'lucide-react';
import type { AttachedFileData } from '../../hooks/useChatScreen';
import { EmojiPicker } from './EmojiPicker';

interface ChatInputBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  attachedFiles?: AttachedFileData[];
  setAttachedFiles?: (files: AttachedFileData[]) => void;
  handleSend: (e?: React.FormEvent) => void;
  t: {
    attachFile: string;
    typeMessage: string;
    emoji: string;
    send: string;
    previewLabel: string;
  };
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  inputText,
  setInputText,
  attachedFiles = [],
  setAttachedFiles,
  handleSend,
  t
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && setAttachedFiles) {
      const newFiles: AttachedFileData[] = [];
      const currentLength = attachedFiles.length;
      let count = 0;
      
      for (let i = 0; i < e.target.files.length; i++) {
        if (currentLength + count >= 5) break;
        const file = e.target.files[i];
        const previewUrl = URL.createObjectURL(file);
        newFiles.push({ name: file.name, previewUrl, file });
        count++;
      }
      
      if (newFiles.length > 0) {
        setAttachedFiles([...attachedFiles, ...newFiles]);
        if (newFiles.length === 1) {
          window.dispatchEvent(new CustomEvent("global-toast", { detail: `${newFiles[0].name} biriktirildi` }));
        } else {
          window.dispatchEvent(new CustomEvent("global-toast", { detail: `${newFiles.length} rasm biriktirildi` }));
        }
      }
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    if (setAttachedFiles) {
      const newFiles = [...attachedFiles];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      setAttachedFiles(newFiles);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(inputText + emoji);
  };

  return (
    <footer className="sticky bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] px-4 py-3 z-30 relative">
      {showEmoji && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {attachedFiles.length > 0 && (
        <div className="w-full pb-3 flex flex-wrap items-center gap-3 bg-white">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs bg-slate-900 border border-slate-200">
                  <img 
                    src={file.previewUrl} 
                    alt={t.previewLabel} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveFile(idx)} 
                  className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-slate-500 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer z-10 hover:bg-slate-600 transition-colors border border-white"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <span className="text-[12px] font-normal text-slate-500 truncate max-w-[220px]">
                {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="w-full flex items-center gap-3">
        <input
          aria-label={t.attachFile}
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          multiple
        />

        {/* Unified rounded input box matching reference screenshot */}
        <div className="flex-1 flex items-center bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 transition-all focus-within:border-brand-primary/40 focus-within:ring-2 focus-within:ring-brand-primary/10">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center shrink-0"
            title={t.attachFile}
          >
            <Paperclip size={20} />
          </button>

          <form onSubmit={handleSend} className="flex-1 mx-2 focus:outline-none outline-none">
            <input
              aria-label={t.typeMessage}
              type="text"
              style={{ outline: 'none', boxShadow: 'none' }}
              className="w-full bg-transparent text-slate-800 text-xs sm:text-sm placeholder:text-slate-400 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 p-0 shadow-none"
              placeholder="Xabar yozing..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </form>

          <button 
            onClick={() => setShowEmoji(!showEmoji)} 
            type="button"
            className={`p-1 transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center shrink-0 ${
              showEmoji ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
            title={t.emoji}
          >
            <Smile size={20} />
          </button>
        </div>

        <button
          onClick={() => handleSend()}
          type="button"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-md hover:shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          title={t.send}
        >
          <Send size={18} />
        </button>
      </div>
    </footer>
  );
};
