import React, { useState } from 'react';
import { ArrowLeft, Plus, CreditCard, ArrowUpRight, ArrowDownLeft, Landmark, Zap, Clock3, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';
import { translations } from '../../../translations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPaymentCardsApi, addPaymentCardApi, fetchTransactionsApi, requestWithdrawalApi } from '../../../api/queries';
import { useAuthStore } from '../../../store/useAuthStore';

const QUICK_AMOUNTS = [50000, 100000, 200000, 'MAX'];

export const PaymentsScreen: React.FC = () => {
  const { setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const user = useAuthStore(state => state.userProfile);
  const t = translations[language];
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  
  // Add Card Modal State
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExp, setNewCardExp] = useState('');

  const { data: savedCards = [] } = useQuery({
    queryKey: ['paymentCards'],
    queryFn: fetchPaymentCardsApi,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactionsApi,
  });

  const addCardMutation = useMutation({
    mutationFn: addPaymentCardApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentCards'] });
      setIsAddCardOpen(false);
      setNewCardNumber('');
      setNewCardExp('');
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: requestWithdrawalApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setWithdrawAmount('');
      alert(language === 'uz' ? 'Mablag\' yechish so\'rovi yuborildi' : 'Запрос на вывод отправлен');
    },
    onError: (err: any) => {
      alert(err.message || 'Xatolik yuz berdi');
    }
  });

  const formatMoney = (amount: number | string) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardNumber.length >= 16) {
      const type = newCardNumber.startsWith('8600') ? 'uzcard' : 'humo';
      const last4 = newCardNumber.slice(-4);
      addCardMutation.mutate({ type, last4, bank: 'Bank' });
    }
  };

  const currentBalance = user?.balance || 0;

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 md:pb-6 flex flex-col min-h-screen bg-slate-50 relative">
      
      {/* Header */}
      <header className="w-full flex items-center gap-3 pt-5 pb-4 px-4 md:px-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30">
        <button 
          onClick={() => setCurrentScreen('profile')}
          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-full text-slate-700 cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" />
        </button>
        <div>
          <h1 className="font-display text-lg font-black text-slate-800 tracking-tight">
            {language === 'uz' ? "To'lovlar va Daromad" : language === 'ru' ? "Платежи и Доходы" : "Payments & Earnings"}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            {language === 'uz' ? 'Balans va tranzaksiyalar' : language === 'ru' ? 'Баланс и транзакции' : 'Balance and transactions'}
          </p>
        </div>
      </header>

      <div className="px-4 md:px-6 flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-500 mt-2">
        
        {/* Clean Balance Card */}
        <section className="w-full bg-brand-primary rounded-[24px] p-6 shadow-md relative overflow-hidden text-white flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-white/80 text-xs font-medium mb-1">
                {language === 'uz' ? 'Asosiy Balans' : 'Основной баланс'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <h2 className="font-display font-black text-4xl tracking-tight">
                  {formatMoney(currentBalance)}
                </h2>
                <span className="text-white/80 font-bold text-sm">UZS</span>
              </div>
            </div>
            <Landmark size={24} className="text-white/40" />
          </div>
        </section>

        {/* Clean Tabs */}
        <div className="bg-white p-1 rounded-xl flex border border-slate-200">
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${activeTab === 'withdraw' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Zap size={14} />
            {language === 'uz' ? 'Pul yechish' : 'Снять деньги'}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${activeTab === 'history' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock3 size={14} />
            {language === 'uz' ? 'Tarix' : 'История'}
          </button>
        </div>

        {/* Withdraw Section */}
        {activeTab === 'withdraw' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Cards List */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 pl-1">
                {language === 'uz' ? 'Mening Kartalarim' : 'Мои карты'}
              </h3>
              
              <div className="flex flex-col gap-3">
                {savedCards.map((card: any) => (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`p-4 rounded-xl border-2 flex items-center gap-4 cursor-pointer transition-colors ${
                      selectedCardId === card.id 
                      ? 'border-brand-primary bg-blue-50/50' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCardId === card.id ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        •••• {card.last4}
                        <span className="text-[10px] font-black uppercase text-slate-400">{card.type}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">{card.bank}</p>
                    </div>
                    {selectedCardId === card.id && <CheckCircle2 size={20} className="text-brand-primary" />}
                  </div>
                ))}

                <button 
                  onClick={() => setIsAddCardOpen(true)}
                  className="p-4 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center gap-2 text-slate-500 hover:bg-slate-50 hover:text-brand-primary hover:border-brand-primary transition-colors"
                >
                  <Plus size={18} />
                  <span className="text-sm font-bold">{language === 'uz' ? 'Yangi karta qo\'shish' : 'Добавить карту'}</span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                {language === 'uz' ? 'Summa (UZS)' : 'Сумма'}
              </label>
              <input 
                type="number" 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-2xl font-display font-bold text-slate-800 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
              
              <div className="flex gap-2 mb-6">
                {QUICK_AMOUNTS.map((amount, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (amount === 'MAX') setWithdrawAmount(currentBalance.toString());
                      else setWithdrawAmount(amount.toString());
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    {amount === 'MAX' ? amount : `${formatMoney(amount as number)}`}
                  </button>
                ))}
              </div>

              <button 
                disabled={!withdrawAmount || Number(withdrawAmount) < 1000 || !selectedCardId || withdrawMutation.isPending}
                onClick={() => withdrawMutation.mutate(Number(withdrawAmount))}
                className="w-full py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/95 disabled:bg-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                {withdrawMutation.isPending ? 'Kuting...' : (language === 'uz' ? "Kartaga yechish" : 'Вывести на карту')}
              </button>
            </div>
          </div>
        )}

        {/* History Section */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-300 pb-8">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'deposit' 
                    ? 'bg-emerald-50 text-emerald-500' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {tx.type === 'deposit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{tx.type === 'deposit' ? 'Balans to\'ldirish' : 'Pul yechish'}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</span>
                    {tx.status === 'pending' && (
                      <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                        {language === 'uz' ? 'Kutilmoqda' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold text-sm ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{formatMoney(tx.amount)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">UZS</p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm">Tranzaksiyalar yo'q</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-lg text-slate-800">
                {language === 'uz' ? 'Yangi karta qo\'shish' : 'Добавить карту'}
              </h3>
              <button 
                onClick={() => setIsAddCardOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCard} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                  Karta raqami
                </label>
                <input 
                  type="text" 
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  placeholder="8600 1234 5678 9012"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                  Amal qilish muddati
                </label>
                <input 
                  type="text" 
                  value={newCardExp}
                  onChange={(e) => setNewCardExp(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
              <button 
                disabled={addCardMutation.isPending}
                type="submit"
                className="w-full py-3.5 mt-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/95 transition-colors disabled:bg-slate-300"
              >
                {addCardMutation.isPending ? 'Kuting...' : (language === 'uz' ? "Qo'shish" : 'Добавить')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
