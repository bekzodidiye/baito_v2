import React, { useState } from 'react';

const emojiCategories = [
  {
    id: 'recent',
    icon: '🕐',
    label: "Ko'p ishlatiladigan",
    emojis: ['👍', '❤️', '😊', '🙏', '✅', '🔥', '😂', '🤝', '👏', '💪', '🎉', '😢']
  },
  {
    id: 'smileys',
    icon: '😊',
    label: 'Yuzlar',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
      '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🤭', '🫢', '🤫', '🤔', '🫡', '🤐',
      '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
      '🤒', '🤕', '🤢', '🤮', '🥴', '😵', '🤯', '🥳',
      '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '😈',
      '👿', '💀', '☠️', '💩', '🤡', '👻', '👽', '🤖'
    ]
  },
  {
    id: 'gestures',
    icon: '👋',
    label: "Qo'llar",
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳',
      '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟',
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
      '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
      '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
      '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻'
    ]
  },
  {
    id: 'hearts',
    icon: '❤️',
    label: 'Yuraklar',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '♥️', '🫀', '💋',
      '💌', '💐', '🌹', '🥀', '🌺', '🌸', '💮', '🏵️'
    ]
  },
  {
    id: 'objects',
    icon: '🎯',
    label: 'Narsalar',
    emojis: [
      '⭐', '🌟', '✨', '💫', '🎯', '🎪', '🎭', '🎨',
      '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🎸',
      '🎺', '🎻', '🥁', '📱', '💻', '🖥️', '📷', '📸',
      '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻',
      '🎙️', '⏰', '🔔', '📢', '📣', '💡', '🔦', '🕯️',
      '📚', '📖', '📝', '✏️', '📌', '📎', '🔑', '🗝️'
    ]
  },
  {
    id: 'symbols',
    icon: '✅',
    label: 'Belgilar',
    emojis: [
      '✅', '❌', '⭕', '❗', '❓', '‼️', '⁉️', '💯',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪',
      '🟤', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '🏁',
      '🚩', '🎌', '🏴', '🏳️', '⚡', '🔥', '💧', '🌊',
      '🌈', '☀️', '🌤️', '⛅', '🌥️', '🌦️', '🌧️', '⛈️'
    ]
  },
  {
    id: 'work',
    icon: '💼',
    label: 'Ish',
    emojis: [
      '💼', '📁', '📂', '🗂️', '📋', '📊', '📈', '📉',
      '🗃️', '🗄️', '🗑️', '📆', '📅', '🗓️', '📇', '🗒️',
      '📑', '📄', '📃', '🧾', '💰', '💵', '💴', '💶',
      '💷', '💸', '💳', '🧮', '⚖️', '🏗️', '🏢', '🏬',
      '🏭', '🏪', '🏫', '🏥', '🏦', '🏨', '🛠️', '⚙️'
    ]
  }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('recent');

  const currentCategory = emojiCategories.find(c => c.id === activeCategory) || emojiCategories[0];

  return (
    <div className="absolute bottom-14 right-0 left-0 mx-3 bg-white border border-slate-200/80 rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{currentCategory.label}</h3>
        <button 
          onClick={onClose} 
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="h-[200px] overflow-y-auto px-3 pb-2 no-scrollbar">
        <div className="grid grid-cols-8 gap-0.5">
          {currentCategory.emojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(emoji)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-xl hover:bg-slate-100 active:scale-90 transition-all cursor-pointer border-none bg-transparent select-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center border-t border-slate-100 bg-slate-50/80 px-1 py-1">
        {emojiCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-1 flex items-center justify-center py-2 rounded-lg text-base transition-all cursor-pointer border-none ${
              activeCategory === cat.id 
                ? 'bg-white shadow-sm scale-110' 
                : 'bg-transparent hover:bg-white/60'
            }`}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
