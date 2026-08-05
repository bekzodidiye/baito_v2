import React, { useState } from 'react';
import { ArrowLeft, Plus, CreditCard, ArrowUpRight, ArrowDownLeft, Landmark, Zap, Clock3, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';
import { translations } from '../../../translations';

// Mock Data
const INITIAL_CARDS = [
  { id: 1, type: 'uzcard', last4: '4321', bank: 'NBU', balance: '1 250 000' },
  { id: 2, type: 'humo', last4: '8899', bank: 'Kapitalbank', balance: '400 000' }
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 'MAX'];

const TRANSACTIONS = [
  { id: 1, type: 'deposit', amount: 150000, date: 'Bugun, 14:30', title: 'Ish haqi: Uyni tozalash', status: 'success' },
  { id: 2, type: 'withdraw', amount: 50000, date: 'Kecha, 09:15', title: 'Kartaga yechish (Uzcard *4321)', status: 'success' },
  { id: 3, type: 'deposit', amount: 85000, date: '12-Avgust', title: 'Ish haqi: Yuk tashish', status: 'success' },
  { id: 4, type: 'withdraw', amount: 200000, date: '10-Avgust', title: 'Kartaga yechish (Humo *8899)', status: 'pending' },
];

export const PaymentsScreen: React.FC = () => {
  const { setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');
  const [savedCards, setSavedCards] = useState(INITIAL_CARDS);
  const [selectedCard, setSelectedCard] = useState<number | null>(INITIAL_CARDS[0].id);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  
  // Add Card Modal State
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExp, setNewCardExp] = useState('');

  const formatMoney = (amount: number | string) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardNumber.length >= 16) {
      const type = newCardNumber.startsWith('8600') ? 'uzcard' : 'humo';
      const last4 = newCardNumber.slice(-4);
      const newCard = {
        id: Date.now(),
        type,
        last4,
        bank: 'Yangi Karta',
        balance: '0'
      };
      setSavedCards([...savedCards, newCard]);
      setSelectedCard(newCard.id);
      setIsAddCardOpen(false);
      setNewCardNumber('');
      setNewCardExp('');
    }
  };

  const currentBalance = 345000;

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
                {savedCards.map(card => (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCard(card.id)}
                    className={`p-4 rounded-xl border-2 flex items-center gap-4 cursor-pointer transition-colors ${
                      selectedCard === card.id 
                      ? 'border-brand-primary bg-blue-50/50' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCard === card.id ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        •••• {card.last4}
                        <span className="text-[10px] font-black uppercase text-slate-400">{card.type}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">{card.bank}</p>
                    </div>
                    {selectedCard === card.id && <CheckCircle2 size={20} className="text-brand-primary" />}
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
                disabled={!withdrawAmount || Number(withdrawAmount) > currentBalance || Number(withdrawAmount) < 10000}
                className="w-full py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/95 disabled:bg-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                {language === 'uz' ? "Pulni ko'chirish" : 'Перевести'}
              </button>
            </div>
          </div>
        )}

        {/* History Section */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-300 pb-8">
            {TRANSACTIONS.map(tx => (
              <div key={tx.id} className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'deposit' 
                    ? 'bg-emerald-50 text-emerald-500' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {tx.type === 'deposit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{tx.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500">{tx.date}</span>
                    {tx.status === 'pending' && (
                      <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase bg-amber-100 text-amber-700">
                        {language === 'uz' ? 'Kutilmoqda' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className={`font-display font-bold text-sm ${
                    tx.type === 'deposit' ? 'text-emerald-500' : 'text-slate-800'
                  }`}>
                    {tx.type === 'deposit' ? '+' : '-'}{formatMoney(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddCardOpen(false)} />
          <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4">
            <button 
              onClick={() => setIsAddCardOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
            
            <h2 className="font-display font-bold text-xl text-slate-800 mb-6">
              {language === 'uz' ? 'Yangi karta qo\'shish' : 'Добавление карты'}
            </h2>
            
            <form onSubmit={handleAddCard} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">
                  {language === 'uz' ? 'Karta raqami' : 'Номер карты'}
                </label>
                <input 
                  type="text" 
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="8600 0000 0000 0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
                  required
                  minLength={16}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">
                  {language === 'uz' ? 'Amal qilish muddati' : 'Срок действия'}
                </label>
                <input 
                  type="text" 
                  value={newCardExp}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (val.length > 2) val = val.slice(0,2) + '/' + val.slice(2);
                    setNewCardExp(val);
                  }}
                  placeholder="MM/YY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
                  required
                  minLength={5}
                />
              </div>
              <button 
                type="submit"
                disabled={newCardNumber.length < 16 || newCardExp.length < 5}
                className="w-full py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/95 disabled:bg-slate-300 transition-colors mt-2"
              >
                {language === 'uz' ? 'Saqlash' : 'Сохранить'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentsScreen;
