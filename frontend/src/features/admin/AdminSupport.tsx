import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { SupportTicket, SupportTicketDetail } from './types';
import { Headphones, User, MessageCircle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { SupportTicketChat } from './SupportTicketChat';
import { fetchAdminTicketApi, replyToTicketApi, updateTicketStatusApi } from '../../api/queries';
import { showToast } from '../../utils/toast';

interface AdminSupportProps {
  supportTickets: SupportTicket[];
}

const formatTicketTime = (raw?: string): string => {
  if (!raw) return '';
  const d = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const AdminSupport: React.FC<AdminSupportProps> = ({ supportTickets }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'open' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState('');

  const openTicket = async (id: string) => {
    setLoadingTicket(true);
    try {
      setSelectedTicket(await fetchAdminTicketApi(id));
    } catch (e) {
      console.error('Could not load the ticket', e);
      showToast("Murojaatni yuklab bo'lmadi. Qaytadan urinib ko'ring.");
      setSelectedTicket(null);
    } finally {
      setLoadingTicket(false);
    }
  };

  React.useEffect(() => {
    setTickets(supportTickets);
  }, [supportTickets]);

  const quickReplies = [
    'Assalomu alaykum! Murojaatingiz qabul qilindi, 15 daqiqa ichida o\'rganib chiqamiz.',
    'To\'lovingiz muvaffaqiyatli tekshirildi va balansga qaytarildi.',
    'Iltimos, hodisa joyidan olingan fotosuratlarni yuboring.',
  ];

  const filteredTickets = tickets.filter((t) => activeTab === 'all' || t.status === activeTab);

  const countNew = tickets.filter(t => t.status === 'new').length;
  const countOpen = tickets.filter(t => t.status === 'open').length;
  const countResolved = tickets.filter(t => t.status === 'resolved').length;

  const handleSendReply = async (text: string) => {
    if (!selectedTicket || !text.trim()) return;
    const id = selectedTicket.id;
    setReplyText('');
    try {
      await replyToTicketApi(id, { text: text.trim(), status: 'open' });
      setSelectedTicket(await fetchAdminTicketApi(id));
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'open' } : t)));
    } catch (e) {
      console.error('Could not send the reply', e);
      showToast("Javobni yuborib bo'lmadi. Qaytadan urinib ko'ring.");
      setReplyText(text);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateTicketStatusApi(id, 'resolved');
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'resolved' } : t)));
      if (selectedTicket?.id === id) setSelectedTicket(null);
      showToast("Ticket hal etildi");
    } catch (e) {
      console.error('Could not resolve the ticket', e);
      showToast("Holatni o'zgartirib bo'lmadi.");
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jami murojaatlar</span>
            <Headphones size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-slate-900">{tickets.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Yangi</span>
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
          </div>
          <div className="text-xl font-black text-brand-primary">{countNew}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jarayonda</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{countOpen}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hal etilgan</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{countResolved}</div>
        </div>
      </div>

      {/* Header and Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <Headphones size={18} />
            </div>
            <span>{a.supportTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Foydalanuvchilardan kelgan murojaatlar va nizoli holatlarga tezkor javob bering
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
          {(['all', 'new', 'open', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer transition-all ${
                activeTab === tab
                  ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {tab === 'all' ? a.statusAll : tab === 'new' ? a.ticketNew : tab === 'open' ? a.chipInProgress : a.ticketResolved}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: List + Chat Viewer */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Ticket List Column */}
        <div className="lg:col-span-1 space-y-2.5">
          {filteredTickets.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-16 bg-white border border-slate-200/90 rounded-3xl shadow-xs">
              <MessageCircle size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">
                {tickets.length === 0 ? "Hozircha murojaatlar yo'q" : "Ushbu holatda murojaat topilmadi"}
              </p>
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicket(t.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group shadow-2xs ${
                  selectedTicket?.id === t.id
                    ? 'bg-brand-primary/10 border-brand-primary/40 shadow-sm'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">ID: {t.id.slice(0, 8)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      t.priority === 'urgent'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                    }`}
                  >
                    {t.priority.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-brand-primary transition-colors">
                  {t.subject}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <User size={12} className="text-slate-400" />
                    <span>{t.userName}</span>
                  </span>
                  <span>•</span>
                  <span>{formatTicketTime(t.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat / Detail View Column */}
        <div className="lg:col-span-2">
          <SupportTicketChat
            ticket={selectedTicket}
            loading={loadingTicket}
            onClose={() => setSelectedTicket(null)}
            onResolve={handleResolve}
            onSendReply={handleSendReply}
            replyText={replyText}
            setReplyText={setReplyText}
            quickReplies={quickReplies}
          />
        </div>
      </div>
    </div>
  );
};
