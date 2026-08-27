import React from 'react';
import { SupportTicket } from './types';
import { CheckCircle, Send, X, MessageSquare } from 'lucide-react';

interface SupportTicketChatProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  onResolve: (id: string) => void;
  onSendReply: (replyText: string) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  quickReplies: string[];
}

export const SupportTicketChat: React.FC<SupportTicketChatProps> = ({
  ticket,
  onClose,
  onResolve,
  onSendReply,
  replyText,
  setReplyText,
  quickReplies,
}) => {
  if (!ticket) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 flex flex-col items-center justify-center h-[520px]">
        <MessageSquare size={40} className="text-slate-300 mb-2" />
        <p className="font-extrabold text-slate-700 text-sm">Ticket tanlanmadi</p>
        <p className="text-xs text-slate-400 max-w-xs mt-1">Chap tomondagi ro'yxatdan biror ticketni tanlang va muloqotni boshlang.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onSendReply(replyText);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 flex flex-col h-[520px] shadow-xs">
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">{ticket.subject}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ticket.userName} ({ticket.userRole === 'worker' ? 'Ishchi' : 'Ish beruvchi'})</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onResolve(ticket.id)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle size={14} /> Hal etildi
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 text-xs">
        {ticket.messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              m.sender === 'admin' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
            }`}>
              <p className="font-medium leading-relaxed">{m.text}</p>
              <span className={`text-[10px] block text-right mt-1 font-bold ${m.sender === 'admin' ? 'text-blue-200' : 'text-slate-400'}`}>{m.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-200/80 bg-white rounded-b-2xl space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {quickReplies.map((qr, i) => (
            <button key={i} onClick={() => setReplyText(qr)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer">
              {qr.slice(0, 30)}...
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Javobingizni yozing..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer">
            <Send size={14} /> Yuborish
          </button>
        </form>
      </div>
    </div>
  );
};
