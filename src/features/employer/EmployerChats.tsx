import { EmployerPageHeader } from './EmployerPageHeader';
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useEmployer } from '../../hooks/useEmployer';
import { Send, ArrowLeft, CheckCheck, Smile, Paperclip, MessageSquare, Phone, MoreVertical, Search, Inbox, SquarePen, X, AlertTriangle, RotateCcw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeGetItem, safeSetItem } from '../../utils/storage';

interface EmployerChatsProps {
  initialTargetCandidate?: string | null;
  onClearTargetCandidate?: () => void;
}

interface ChatSession {
  id: string;
  candidateName: string;
  candidateAvatar: string;
  lastMessage: string;
  time: string;
  messages: { id: string; sender: 'user' | 'recruiter'; text: string; time: string; hasMap?: boolean; mapLocation?: string }[];
}

export const EmployerChats: React.FC<EmployerChatsProps> = ({ 
  initialTargetCandidate,
  onClearTargetCandidate
}) => {
  const { language } = useEmployer();
  const { setToastMessage, setEmployerSelectedChatId, messagesSearchOpen, setMessagesSearchOpen } = useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCandidate, setComposeCandidate] = useState('');
  const [composeMessage, setComposeMessage] = useState('');

  // Synchronize with global AppContext for header/layout awareness
  useEffect(() => {
    setEmployerSelectedChatId(selectedSessionId);
    return () => {
      setEmployerSelectedChatId(null);
    };
  }, [selectedSessionId, setEmployerSelectedChatId]);

  // Initialize chats
  useEffect(() => {
    const cached = safeGetItem('baito_employer_chats');
    let initialSessions: ChatSession[] = [];

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          initialSessions = parsed.filter(Boolean).map((s: any) => ({
            ...s,
            messages: Array.isArray(s.messages) ? s.messages : []
          }));
        }
      } catch (e) {
        console.error("Error parsing baito_employer_chats from localStorage", e);
      }
    }

    if (initialSessions.length === 0) {
      initialSessions = [
        {
          id: 'chat-1',
          candidateName: 'Sardor Jo\'rayev',
          candidateAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
          lastMessage: language === 'uz' ? 'Assalomu alaykum, ish joyini aniq manzilini yubora olasizmi?' : language === 'ru' ? 'Здравствуйте, не могли бы вы прислать точный адрес работы?' : "Hello, could you please send the exact work address?",
          time: '10:30',
          messages: [
            { id: '1', sender: 'user', text: language === 'uz' ? 'Assalomu alaykum, ish joyini aniq manzilini yubora olasizmi?' : language === 'ru' ? 'Здравствуйте, не могли бы вы прислать точный адрес работы?' : "Hello, could you please send the exact work address?", time: '10:30' }
          ]
        },
        {
          id: 'chat-2',
          candidateName: 'Madina Karimova',
          candidateAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
          lastMessage: language === 'uz' ? 'Tushlik beriladimi?' : language === 'ru' ? 'Обед предоставляется?' : "Is lunch provided?",
          time: 'Kecha',
          messages: [
            { id: '1', sender: 'recruiter', text: language === 'uz' ? 'Assalomu alaykum, ish vaqti 8:00 dan boshlanadi.' : language === 'ru' ? 'Здравствуйте, рабочее время начинается в 8:00.' : "Hello, working hours start at 8:00.", time: 'Kecha' },
            { id: '2', sender: 'user', text: language === 'uz' ? 'Tushlik beriladimi?' : language === 'ru' ? 'Обед предоставляется?' : "Is lunch provided?", time: 'Kecha' }
          ]
        }
      ];
      safeSetItem('baito_employer_chats', JSON.stringify(initialSessions));
    }

    // Handle incoming chat request from applicants page
    if (initialTargetCandidate) {
      const existing = initialSessions.find(s => s && s.candidateName === initialTargetCandidate);
      if (existing) {
        setSelectedSessionId(existing.id);
      } else {
        const newSessionId = `chat-${Date.now()}`;
        const newSession: ChatSession = {
          id: newSessionId,
          candidateName: initialTargetCandidate,
          candidateAvatar: initialTargetCandidate === 'Ozodbek Salimov' 
            ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBV5vW9Q4kqcTjWFKoh-KR04d1qzMZPJ62TDzGP6_gX-nGUH6-3jlTsJQ90EfuIefQNJheUcY9CRWFNakg652EU2JbKupldyWYP-rpC64brXMbbrLUmwXosUlEpwaqzePB-co_wbYO2TugYmaW6th1vxxa6L1e0Zjc71aKsTVR0EPwJ7_6vnmpXqapqsQ-o6ntR3kaIJvHEXeFTLrpQ4oelMSTrKykETbGUF45T9L4Ayf-1EZX-E1p-'
            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
          lastMessage: language === 'uz' ? "Suhbat boshlandi" : language === 'ru' ? "Чат начат" : "Chat started",
          time: 'Hozir',
          messages: []
        };
        initialSessions.unshift(newSession);
        safeSetItem('baito_employer_chats', JSON.stringify(initialSessions));
        setSelectedSessionId(newSessionId);
      }
      if (onClearTargetCandidate) onClearTargetCandidate();
    }

    setSessions(initialSessions);
  }, [initialTargetCandidate, language]);

  // Auto-save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      safeSetItem('baito_employer_chats', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSessionId, sessions]);

  const activeSession = sessions?.filter(Boolean).find(s => s.id === selectedSessionId);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedSessionId) return;

    const updatedSessions = sessions.filter(Boolean).map(session => {
      if (session.id === selectedSessionId) {
        const newMsg = {
          id: `msg-${Date.now()}`,
          sender: 'recruiter' as const,
          text: inputText.trim(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const updatedMsgs = [...(session.messages || []), newMsg];
        return {
          ...session,
          messages: updatedMsgs,
          lastMessage: inputText.trim(),
          time: 'Hozir'
        };
      }
      return session;
    });

    setSessions(updatedSessions);
    safeSetItem('baito_employer_chats', JSON.stringify(updatedSessions));
    setInputText('');

    // Trigger candidate reply
    const currentName = activeSession?.candidateName;
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setSessions(prevSessions => {
        return (prevSessions || []).filter(Boolean).map(session => {
          if (session.id === selectedSessionId) {
            const replyMsg = {
              id: `msg-reply-${Date.now()}`,
              sender: 'user' as const,
              text: language === 'uz' ? `Rahmat javob uchun! Ertaga soat nechada yetib borishim kerak?` : language === 'ru' ? `Thanks for the reply! What time should I arrive tomorrow?` : `Thanks for the reply! What time should I arrive tomorrow?`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            return {
              ...session,
              messages: [...(session.messages || []), replyMsg],
              lastMessage: replyMsg.text,
              time: 'Hozir'
            };
          }
          return session;
        });
      });
    }, 1500);
  };

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeCandidate.trim() || !composeMessage.trim()) return;

    const newSessionId = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      candidateName: composeCandidate.trim(),
      candidateAvatar: '',
      lastMessage: composeMessage.trim(),
      time: 'Hozir',
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'recruiter',
          text: composeMessage.trim(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      safeSetItem('baito_employer_chats', JSON.stringify(updated));
      return updated;
    });
    setComposeOpen(false);
    setComposeCandidate('');
    setComposeMessage('');
    setSelectedSessionId(newSessionId);
  };

  const filteredChats = sessions.filter(s => 
    s.candidateName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const t = {
    searchChatPlaceholder: language === 'uz' ? 'Xabarlarni qidirish...' : language === 'ru' ? 'Поиск сообщений...' : "Search messages...",
    noConversations: language === 'uz' ? 'Suhbatlar yo\'q' : language === 'ru' ? 'Нет чатов' : "No chats",
    archivedConversations: language === 'uz' ? 'Arxivlangan suhbatlar mavjud emas' : language === 'ru' ? 'Архивированных чатов нет' : "No archived chats",
    writeNewMessage: language === 'uz' ? 'Yangi xabar' : language === 'ru' ? 'Новое сообщение' : "New message",
    candidateClient: language === 'uz' ? 'Nomzod ism-sharifi' : language === 'ru' ? 'ФИО кандидата' : "Candidate Name",
    candidatePlaceholder: language === 'uz' ? 'Ismini kiriting' : language === 'ru' ? 'Введите имя' : "Enter name",
    messageText: language === 'uz' ? 'Xabar matni' : language === 'ru' ? 'Текст сообщения' : "Message text",
    messagePlaceholder: language === 'uz' ? 'Xabaringizni yozing...' : language === 'ru' ? 'Напишите ваше сообщение...' : "Type your message...",
    sendMessage: language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : "Send",
    conversationNotStarted: language === 'uz' ? 'Suhbat hali boshlanmagan' : language === 'ru' ? 'Чат еще не начат' : "Chat not started",
    back: language === 'uz' ? 'Orqaga' : language === 'ru' ? 'Назад' : "Back",
    online: language === 'uz' ? 'Onlayn' : language === 'ru' ? 'Онлайн' : "Online",
    offline: language === 'uz' ? 'Oflayn' : language === 'ru' ? 'Офлайн' : "Offline",
    today: language === 'uz' ? 'Bugun' : language === 'ru' ? 'Сегодня' : "Today",
    workplace: language === 'uz' ? 'Ish joyi' : language === 'ru' ? 'Место работы' : "Workplace",
    workplaceMap: language === 'uz' ? 'Ish joyi xaritasi' : language === 'ru' ? 'Карта места работы' : "Workplace map",
    directions: language === 'uz' ? 'Yo\'nalishni ko\'rish' : language === 'ru' ? 'Посмотреть маршрут' : "View directions",
    attachFile: language === 'uz' ? "Fayl biriktirish" : language === 'ru' ? "Прикрепить файл" : "Attach file",
    typeMessage: language === 'uz' ? "Xabar yozing..." : language === 'ru' ? "Напишите сообщение..." : "Type a message...",
    emoji: language === 'uz' ? "Emoji" : language === 'ru' ? "Эмодзи" : "Emoji"
  };

  if (selectedSessionId && activeSession) {
    const safeMessages = Array.isArray(activeSession.messages) 
      ? activeSession.messages.filter(m => m && typeof m === 'object' && m.sender)
      : [];

    return (
      <div className="flex flex-col h-screen md:h-[calc(100vh-2rem)] bg-brand-background relative pt-0 max-w-6xl mx-auto w-full">
        {/* Top App Bar identical to ChatHeader */}
        <header className="sticky top-0 w-full z-30 bg-white shadow-2xs border-b border-slate-100">
          <div className="w-full max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSessionId(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer text-brand-text-variant border-none bg-transparent"
                aria-label={t.back}
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand-surface-low flex items-center justify-center overflow-hidden border border-brand-outline-variant">
                    {activeSession.candidateAvatar ? (
                      <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-xs">
                        {(activeSession.candidateName || 'C').charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-secondary rounded-full border-2 border-white animate-pulse" />
                </div>

                <div className="flex flex-col">
                  <h1 className="font-display font-bold text-sm text-brand-primary leading-tight">
                    {activeSession.candidateName}
                  </h1>
                  <span className="text-[10px] font-bold text-brand-secondary">
                    {t.online}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 relative">
              <button onClick={() => { window.location.href = `tel:${(activeSession as any).candidatePhone || '+998901234567'}`; }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low text-brand-text-variant cursor-pointer transition-colors border-none bg-transparent" title="Qo'ng'iroq qilish">
                <Phone size={18} />
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("global-toast", { detail: language === 'uz' ? "Nomzod profili saqlandi" : "Профиль кандидата сохранен" }))} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low text-brand-text-variant cursor-pointer transition-colors border-none bg-transparent" title="Menyu">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Messages Canvas */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 overflow-y-auto no-scrollbar flex flex-col space-y-4">
          <div className="flex justify-center my-2">
            <span className="px-3.5 py-1.5 bg-white text-brand-text-variant font-bold text-[10px] rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.06),_0_1px_2px_rgba(0,0,0,0.02)] border border-brand-outline-variant/15">
              {t.today}
            </span>
          </div>

          {safeMessages.map((msg, index) => {
            const isRecruiter = msg.sender === 'recruiter';

            return (
              <div
                key={msg.id || index}
                className={`flex items-end gap-2 max-w-[85%] ${
                  isRecruiter ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {!isRecruiter && (
                  <div className="w-8 h-8 rounded-full bg-brand-surface-low flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-outline-variant shadow-xs">
                    {activeSession.candidateAvatar ? (
                      <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs text-brand-primary">{(activeSession.candidateName || 'C').charAt(0)}</span>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                      isRecruiter
                        ? 'bg-brand-primary text-white rounded-br-none shadow-[inset_0_4px_8px_rgba(0,0,0,0.25),_inset_0_1px_3px_rgba(0,0,0,0.12),_0_4px_12px_rgba(26,35,126,0.25)]'
                        : 'bg-white text-brand-text rounded-bl-none border border-brand-outline-variant/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),_0_2px_6px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    <p>{msg.text}</p>
                    
                    {msg.hasMap && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 bg-white shadow-xs group max-w-sm">
                        <div className="w-full h-28 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                          <svg viewBox="0 0 320 112" className="w-full h-full object-cover select-none">
                            <rect width="320" height="112" fill="#fafafa" />
                            <path d="M -10 -10 C 40 10, 60 40, 30 75 Z" fill="#f0fdf4" />
                            <path d="M 240 -10 C 270 20, 290 10, 310 5 Z" fill="#f0fdf4" />
                            <path d="M -10 90 C 70 85, 110 65, 140 45 C 170 25, 230 15, 330 5" fill="none" stroke="#e0f2fe" strokeWidth="12" />
                            <g stroke="#ffffff" strokeWidth="8">
                              <path d="M -10 40 L 330 40" />
                              <path d="M 120 -10 L 120 120" />
                            </g>
                            <path d="M 120 90 L 120 40 L 160 40" fill="none" stroke="#3b82f6" strokeWidth="3" />
                          </svg>

                          <div className="absolute top-[36%] left-[50%] -translate-x-[50%] -translate-y-[50%]">
                            <div className="relative">
                              <span className="absolute -inset-2 rounded-full bg-red-500/10 animate-ping"></span>
                              <div className="bg-red-500 text-white p-1 rounded-full shadow-md">
                                <MapPin size={14} />
                              </div>
                            </div>
                          </div>

                          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[9px] font-medium py-1 px-2.5 rounded-lg flex items-center gap-1.5 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{msg.mapLocation || t.workplace}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 mt-0.5 ${isRecruiter ? 'justify-end mr-1' : 'ml-1'}`}>
                    <span className="text-[9px] text-brand-outline font-bold">{msg.time}</span>
                    {isRecruiter && <span className="text-[10px] text-brand-primary shrink-0">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2" id="typing-indicator">
              <div className="w-8 h-8 rounded-full bg-brand-surface-low overflow-hidden border border-brand-outline-variant flex-shrink-0 flex items-center justify-center">
                {activeSession.candidateAvatar ? (
                  <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover animate-pulse" />
                ) : (
                  <span className="font-bold text-xs text-brand-primary">{(activeSession.candidateName || 'C').charAt(0)}</span>
                )}
              </div>
              <div className="flex gap-1 bg-white px-4 py-2.5 rounded-full border border-brand-outline-variant/30 shadow-xs">
                <span className="w-1.5 h-1.5 bg-brand-outline rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-brand-outline rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="w-1.5 h-1.5 bg-brand-outline rounded-full animate-bounce [animation-delay:0.6s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input Bar */}
        <footer className="sticky bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-4 py-3 z-30">
          <div className="w-full max-w-5xl mx-auto flex items-center gap-3 relative">
            <input 
              type="file" 
              id="employer-chat-file" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setInputText(`[Fayl: ${e.target.files[0].name}] `);
                  window.dispatchEvent(new CustomEvent("global-toast", { detail: `${e.target.files[0].name} biriktirildi` }));
                }
              }} 
            />
            <button 
              onClick={() => document.getElementById('employer-chat-file')?.click()} 
              type="button"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-brand-text-variant shadow-xs hover:bg-slate-50 transition-all cursor-pointer border-none shrink-0 bg-transparent"
              title={t.attachFile}
            >
              <Paperclip size={18} />
            </button>

            <form onSubmit={handleSend} className="flex-1 relative flex items-center">
              <input
                type="text"
                className="w-full bg-white text-brand-text font-sans rounded-full py-3 px-5 pr-12 shadow-xs border-none focus:outline-none transition-all placeholder:text-brand-outline text-xs font-semibold h-11"
                placeholder={t.typeMessage}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button 
                onClick={() => setInputText(prev => prev + ' 👍')} 
                type="button"
                className="absolute right-4 text-brand-outline hover:text-brand-primary transition-colors cursor-pointer border-none bg-transparent"
                title={t.emoji}
              >
                <Smile size={18} />
              </button>
            </form>

            <button
              onClick={() => handleSend()}
              type="button"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-md hover:shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border-none outline-none"
              title={t.sendMessage}
            >
              <Send size={18} className="translate-x-0.5" />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-24 md:pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? 'Suhbatlar' : language === 'ru' ? 'Чаты' : "Chats"}
        description={language === 'uz' ? "Nomzodlar bilan xabarlashish" : language === 'ru' ? "Общение с кандидатами" : "Chat with candidates"}
        language={language}
        showPostButton={false}
      />
      {/* Search Bar */}
      <AnimatePresence>
        {messagesSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', scale: 1, marginBottom: 4 }}
            exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] h-12 px-4 group/search">
              <Search className="text-slate-400 group-focus-within/search:text-brand-primary transition-colors flex-shrink-0" size={18} />
              <input
                type="text"
                autoFocus
                className="w-full h-full pl-3 pr-8 bg-transparent text-sm font-sans focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800 border-none"
                placeholder={t.searchChatPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {(searchQuery || messagesSearchOpen) && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setMessagesSearchOpen(false);
                  }}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <div className="flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03),_0_1px_3px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden">
        {filteredChats.map((chat, idx) => {
          const messages = Array.isArray(chat.messages) ? chat.messages : [];
          const lastMsg = messages[messages.length - 1];
          const candidateInitial = (chat.candidateName || 'C').charAt(0);

          return (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedSessionId(chat.id)}
              className="flex items-center px-4 py-4 hover:bg-brand-surface-low transition-colors cursor-pointer border-b border-brand-surface-low last:border-none group relative"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-surface-low border border-brand-outline-variant">
                  {chat.candidateAvatar ? (
                    <img src={chat.candidateAvatar} alt={chat.candidateName || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-sm">
                      {candidateInitial}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-secondary border-2 border-white rounded-full" />
              </div>
              
              <div className="ml-4 flex-grow min-w-0 pr-2">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-display font-bold text-sm text-brand-primary truncate group-hover:text-brand-primary-container transition-colors">
                    {chat.candidateName || ''}
                  </h3>
                  <span className={`text-[10px] font-semibold whitespace-nowrap text-brand-text-variant`}>
                    {chat.time || ''}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs truncate pr-4 text-brand-text-variant font-medium`}>
                    {lastMsg?.text || t.conversationNotStarted}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredChats.length === 0 && (
          <div className="p-8 text-center text-brand-text-variant">
            <Inbox size={40} className="mx-auto text-brand-outline-variant mb-2" />
            <p className="font-display font-bold text-sm">{t.noConversations}</p>
          </div>
        )}
      </div>

      {/* Empty state tip */}
      <div className="mt-4 text-center">
        <p className="text-xs text-brand-text-variant opacity-60 font-semibold">
          {t.archivedConversations}
        </p>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setComposeOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/20 flex items-center justify-center active:scale-90 transition-all z-40 cursor-pointer border-none"
        title={t.writeNewMessage}
      >
        <SquarePen size={22} />
      </button>

      {/* Compose Chat Modal overlay */}
      <AnimatePresence>
        {composeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposeOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleComposeSubmit}
              className="relative bg-white w-full max-w-md rounded-2xl p-6 z-10 flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-none"
            >
              <div className="flex justify-between items-center border-b border-brand-surface-low pb-3">
                <h3 className="font-display font-bold text-base text-brand-primary">{t.writeNewMessage}</h3>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="p-1 rounded-full hover:bg-brand-surface-low text-brand-text-variant cursor-pointer border-none bg-transparent"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.candidateClient}</label>
                <input
                  type="text"
                  required
                  placeholder={t.candidatePlaceholder}
                  className="bg-slate-50 border-none rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  value={composeCandidate}
                  onChange={(e) => setComposeCandidate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.messageText}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t.messagePlaceholder}
                  className="bg-slate-50 border-none rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none"
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors mt-2 border-none"
              >
                <span>{t.sendMessage}</span>
                <Send size={14} />
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
