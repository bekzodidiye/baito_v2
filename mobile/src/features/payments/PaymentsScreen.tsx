import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPaymentCardsApi, addPaymentCardApi, fetchTransactionsApi, requestWithdrawalApi } from '../../api/queries';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  ArrowLeft, Search, Wallet, TrendingUp, CreditCard, 
  Clock, Landmark, History, PlusCircle, Briefcase, 
  ChevronRight, Image as ImageIcon, Banknote 
} from 'lucide-react';
import { PaymentModals, PaymentModalType } from './PaymentModals';

export const PaymentsScreen: React.FC = () => {
  const { setCurrentScreen } = useCurrentScreen();
  const navigate = useNavigate();
  const { language } = useApp();
  const user = useAuthStore(state => state.userProfile);
  const queryClient = useQueryClient();

  const [txFilter, setTxFilter] = useState<'all' | 'in' | 'out'>('all');
  const [modalType, setModalType] = useState<PaymentModalType>(null);
  
  const { data: savedCards = [] } = useQuery({
    queryKey: ['paymentCards'],
    queryFn: fetchPaymentCardsApi,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactionsApi,
  });

  const currentBalance = user?.balance || 0;

  const formatMoney = (amount: number | string) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const filteredTransactions = transactions.filter((tx: any) => {
    if (txFilter === 'in') return tx.type === 'deposit';
    if (txFilter === 'out') return tx.type === 'withdraw';
    return true;
  });

  const handleBack = () => {
    if (user?.selectedRole === 'employer') {
      setCurrentScreen('employer-profile');
    } else {
      setCurrentScreen('profile');
    }
  };

  return (
    <div className="bg-brand-background text-slate-900 min-h-screen pb-32 font-sans w-full max-w-4xl mx-auto">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full max-w-4xl z-50 bg-brand-background flex items-center justify-between px-5 h-16 shadow-[0px_4px_20px_rgba(26,35,126,0.04)]">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            aria-label={language === 'uz' ? 'Orqaga' : 'Назад'}
            className="active:scale-95 duration-200 p-2 hover:bg-slate-200 transition-colors rounded-full cursor-pointer"
          >
            <ArrowLeft className="text-brand-primary w-6 h-6" />
          </button>
          <h1 className="text-[18px] font-bold tracking-tight text-brand-primary">
            {language === 'uz' ? "To'lovlar" : language === 'ru' ? "Платежи" : "Payments"}
          </h1>
        </div>
        <button 
          aria-label={language === 'uz' ? 'Qidirish' : 'Поиск'}
          className="active:scale-95 duration-200 p-2 hover:bg-slate-200 transition-colors rounded-full cursor-pointer"
        >
          <Search className="text-brand-primary w-6 h-6" />
        </button>
      </header>

      <main className="mt-20 px-5 space-y-6">
        {/* Main Balance Card */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary-container to-brand-primary p-6 text-white shadow-xl">
          {/* Glassy background decorative element */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center">
            <p className="text-white/70 text-xs font-medium tracking-wider mb-2">
              {language === 'uz' ? 'Hozirgi balans' : language === 'ru' ? 'Текущий баланс' : 'Current Balance'}
            </p>
            <h2 className="text-[32px] font-bold leading-tight mb-6">
              {formatMoney(currentBalance)} {language === 'uz' ? "so'm" : "UZS"}
            </h2>
            <div className="flex items-center gap-3 w-full mt-2">
              <button onClick={() => navigate('/payments/top-up')} className="flex-1 bg-white text-brand-primary font-bold py-3.5 rounded-lg active:scale-95 transition-transform duration-150 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 shadow-sm border border-transparent">
                <PlusCircle size={20} className="fill-current" />
                {language === 'uz' ? "To'ldirish" : language === 'ru' ? 'Пополнить' : 'Deposit'}
              </button>
              <button onClick={() => setModalType('withdraw')} className="flex-1 bg-white/20 text-white font-bold py-3.5 rounded-lg border border-white/30 active:scale-95 transition-transform duration-150 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/30 backdrop-blur-sm shadow-sm">
                <Wallet size={20} className="fill-current" />
                {language === 'uz' ? 'Yechish' : language === 'ru' ? 'Снять' : 'Withdraw'}
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid (Secondary Statistics) */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] text-center border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
              {language === 'uz' ? 'Bu oy daromad' : language === 'ru' ? 'Доход за месяц' : 'Monthly Income'}
            </p>
            <p className="text-brand-primary font-bold text-sm">1.2 mln</p>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] text-center border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
              {language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'Ожидается' : 'Pending'}
            </p>
            <p className="text-blue-600 font-bold text-sm">450k</p>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] text-center border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
              {language === 'uz' ? 'Yechilgan' : language === 'ru' ? 'Снято' : 'Withdrawn'}
            </p>
            <p className="text-slate-800 font-bold text-sm">890k</p>
          </div>
        </section>

        {/* Summary Horizontal Scroll (Bento Style) */}
        <section className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 -mx-5 px-5">
          <div className="min-w-[160px] bg-white p-4 rounded-xl shadow-[0px_4px_12px_rgba(26,35,126,0.04)] border border-slate-200">
            <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center mb-3">
              <TrendingUp size={18} className="text-brand-primary" />
            </div>
            <p className="text-slate-500 text-xs font-medium">
              {language === 'uz' ? 'Jami daromad' : language === 'ru' ? 'Общий доход' : 'Total Income'}
            </p>
            <p className="text-brand-primary font-bold text-lg">2,540,000</p>
          </div>
          
          <div className="min-w-[160px] bg-white p-4 rounded-xl shadow-[0px_4px_12px_rgba(26,35,126,0.04)] border border-slate-200">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <CreditCard size={18} className="text-blue-600" />
            </div>
            <p className="text-slate-500 text-xs font-medium">
              {language === 'uz' ? 'Aktiv kartalar' : language === 'ru' ? 'Активные карты' : 'Active Cards'}
            </p>
            <p className="text-blue-600 font-bold text-lg">{savedCards.length} {language === 'uz' ? 'ta' : 'шт'}</p>
          </div>
          
          <div className="min-w-[160px] bg-white p-4 rounded-xl shadow-[0px_4px_12px_rgba(26,35,126,0.04)] border border-slate-200">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Clock size={18} className="text-slate-800" />
            </div>
            <p className="text-slate-500 text-xs font-medium">
              {language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'В ожидании' : 'Pending'}
            </p>
            <p className="text-slate-800 font-bold text-lg">120,000</p>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4">
          <button onClick={() => navigate('/payments/top-up')} className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.03)] hover:bg-slate-50 transition-all active:scale-95 cursor-pointer border border-slate-100">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <PlusCircle className="text-emerald-600 w-6 h-6" />
            </div>
            <span className="font-semibold text-brand-primary text-sm tracking-tight">
              {language === 'uz' ? "To'ldirish" : language === 'ru' ? 'Пополнить' : 'Deposit'}
            </span>
          </button>

          <button onClick={() => setModalType('withdraw')} className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.03)] hover:bg-slate-50 transition-all active:scale-95 cursor-pointer border border-slate-100">
            <div className="p-2 bg-brand-primary/10 rounded-lg">
              <Banknote className="text-brand-primary w-6 h-6" />
            </div>
            <span className="font-semibold text-brand-primary text-sm tracking-tight">
              {language === 'uz' ? 'Yechib olish' : language === 'ru' ? 'Снять деньги' : 'Withdraw'}
            </span>
          </button>
          
          <button onClick={() => navigate('/payments/my-cards')} className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.03)] hover:bg-slate-50 transition-all active:scale-95 cursor-pointer border border-slate-100">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="text-blue-600 w-6 h-6" />
            </div>
            <span className="font-semibold text-brand-primary text-sm tracking-tight">
              {language === 'uz' ? 'Kartalarim' : language === 'ru' ? 'Мои карты' : 'My Cards'}
            </span>
          </button>
          
          <button onClick={() => navigate('/payments/add-card')} className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-[0px_2px_8px_rgba(0,0,0,0.03)] hover:bg-slate-50 transition-all active:scale-95 cursor-pointer border border-slate-100">
            <div className="p-2 bg-brand-primary-container/20 rounded-lg">
              <PlusCircle className="text-brand-primary w-6 h-6" />
            </div>
            <span className="font-semibold text-brand-primary text-sm tracking-tight">
              {language === 'uz' ? "Karta qo'shish" : language === 'ru' ? 'Добавить карту' : 'Add Card'}
            </span>
          </button>
        </section>

        {/* Recent Transactions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-brand-primary">
              {language === 'uz' ? "So'nggi operatsiyalar" : language === 'ru' ? 'Последние операции' : 'Recent Transactions'}
            </h3>
            <button 
              onClick={() => setTxFilter('all')}
              className="text-brand-primary text-sm font-bold cursor-pointer"
            >
              {language === 'uz' ? 'Hammasi' : language === 'ru' ? 'Все' : 'All'}
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            <button 
              onClick={() => setTxFilter('all')}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                txFilter === 'all' 
                ? 'bg-brand-primary text-white' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {language === 'uz' ? 'Hammasi' : language === 'ru' ? 'Все' : 'All'}
            </button>
            <button 
              onClick={() => setTxFilter('in')}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                txFilter === 'in' 
                ? 'bg-brand-primary text-white' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {language === 'uz' ? 'Kirim' : language === 'ru' ? 'Приход' : 'Income'}
            </button>
            <button 
              onClick={() => setTxFilter('out')}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                txFilter === 'out' 
                ? 'bg-brand-primary text-white' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {language === 'uz' ? 'Chiqim' : language === 'ru' ? 'Расход' : 'Expense'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] divide-y divide-slate-100 overflow-hidden border border-slate-100">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx: any) => (
                <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    {tx.type === 'withdraw' ? (
                       <div className="w-12 h-12 rounded-xl bg-brand-primary/5 flex items-center justify-center shadow-sm">
                         <Landmark className="text-brand-primary w-6 h-6" />
                       </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm text-blue-600">
                        <Briefcase className="w-6 h-6" />
                      </div>
                    )}
                    
                    <div>
                      <p className="font-bold text-[15px] text-brand-primary mb-0.5">
                        {tx.type === 'withdraw' ? (language === 'uz' ? "Mablag' yechish" : "Снятие средств") : (language === 'uz' ? "Kirim" : "Поступление")}
                      </p>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <span>{new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1">
                          {tx.type === 'withdraw' ? <CreditCard size={12} /> : <Wallet size={12} />}
                          {tx.type === 'withdraw' ? 'Uzcard/Humo' : 'Hamyon'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold text-[16px] ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{formatMoney(tx.amount)}
                      </p>
                      {tx.status === 'pending' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 mt-1">
                          {language === 'uz' ? 'Kutilmoqda' : 'В ожидании'}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 mt-1">
                          {language === 'uz' ? 'Bajarildi' : 'Успешно'}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-brand-primary transition-colors w-6 h-6" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <History className="text-slate-300 w-8 h-8" />
                </div>
                <p className="text-slate-800 font-bold mb-1">
                  {language === 'uz' ? 'Tranzaksiyalar yo\'q' : language === 'ru' ? 'Нет транзакций' : 'No transactions'}
                </p>
                <p className="text-slate-500 text-sm">
                  {language === 'uz' ? 'Hozircha hech qanday to\'lov amaliyoti bajarilmagan.' : 'Пока нет ни одной операции.'}
                </p>
              </div>
            )}

            {/* Dummy transactions to match design if there are none in db yet */}
            {filteredTransactions.length === 0 && (
              <>
                {/* Transaction 1 */}
                <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shadow-sm flex items-center justify-center">
                      <ImageIcon className="text-slate-400 w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[15px] text-brand-primary mb-0.5">Lobia Machida — Smena</p>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <span>12 Oct, 2023 • 14:30</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1"><Wallet size={12} /> Hamyon</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-[16px] text-emerald-600">+45,000</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 mt-1">Bajarildi</span>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-brand-primary transition-colors w-6 h-6" />
                  </div>
                </div>
                {/* Transaction 2 */}
                <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/5 flex items-center justify-center shadow-sm">
                      <Landmark className="text-brand-primary w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[15px] text-brand-primary mb-0.5">Mablag' yechish</p>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <span>11 Oct, 2023 • 09:15</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1"><CreditCard size={12} /> Uzcard ****4521</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-[16px] text-red-600">-20,000</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 mt-1">Kutilmoqda</span>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-brand-primary transition-colors w-6 h-6" />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <PaymentModals 
        isOpen={!!modalType} 
        onClose={() => setModalType(null)} 
        type={modalType} 
        currentBalance={currentBalance} 
        savedCards={savedCards}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};
