import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Send, User } from 'lucide-react';
import { Logo } from '../Logo';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  time: string;
}

export const SupportChatScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Assalomu alaykum! Baito yordam xizmatiga xush kelibsiz. Sizga qanday yordam bera olaman?",
      sender: 'support',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate support reply
    setTimeout(() => {
      const replyMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Xabaringizni qabul qildik. Operatorlarimiz tez orada sizga javob qaytarishadi. Iltimos, kuting.",
        sender: 'support',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, replyMessage]);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen md:min-h-[calc(100vh-2rem)] w-full max-w-4xl mx-auto bg-brand-surface relative">
      {/* TopAppBar */}
      <header className="md:hidden sticky top-0 z-30 flex justify-between items-center px-4 h-16 w-full bg-white/90 backdrop-blur-md shadow-2xs shrink-0 border-b border-slate-100">
        <button 
          onClick={() => setCurrentScreen('yordam')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-[16px] font-bold text-brand-primary">Jonli chat</h1>
          <span className="text-[11px] text-green-600 font-medium">Tarmoqda</span>
        </div>
        <div className="w-10 h-10 flex items-center justify-center bg-brand-primary-container/10 rounded-full text-brand-primary">
          <Logo sizeClassName="text-[14px]" />
        </div>
      </header>

      {/* Chat Messages */}
      <main className="md:pt-8 flex-1 overflow-y-auto p-4 space-y-4 w-full pb-20">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              msg.sender === 'user' 
                ? 'bg-brand-primary text-white rounded-tr-sm' 
                : 'bg-white shadow-xs border border-slate-100 text-brand-text rounded-tl-sm'
            }`}>
              <p className="text-[14px] leading-relaxed">{msg.text}</p>
              <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-white/70' : 'text-brand-text-variant'}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Chat Input */}
      <footer className="sticky bottom-0 bg-white border-t border-slate-100 p-3 shrink-0 w-full z-30">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex-1 bg-brand-surface-low rounded-full px-4 py-2 flex items-center">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Xabar yozing..." 
              className="bg-transparent border-none outline-none w-full text-[14px] text-brand-text placeholder:text-brand-text-variant"
            />
          </div>
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-primary/90 transition-colors"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </footer>
    </div>
  );
};
