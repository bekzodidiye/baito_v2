import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPaymentCardsApi, fetchTransactionsApi, fetchUserProfileApi } from '../../api/queries';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  ArrowLeft, Search, Wallet, TrendingUp, CreditCard, 
  Clock, Landmark, History, PlusCircle, Briefcase, 
  ChevronRight, Image as  Banknote 
} from 'lucide-react';
import { PaymentModals, PaymentModalType } from './PaymentModals';
import { TxReceiptModal } from './TxReceiptModal';
import { AnimatePresence } from 'motion/react';

export const PaymentsScreen: React.FC = () => {
  const { setCurrentScreen } = useCurrentScreen();
  const navigate = useNavigate();
  const language = useAuthStore(s => s.language);
  const user = useAuthStore(state => state.userProfile);
  const queryClient = useQueryClient();

  const [txFilter, setTxFilter] = useState<'all' | 'in' | 'out'>('all');
  // The magnifier in the header used to be decoration with an aria-label: it
  // announced itself as a search control and did nothing when pressed.
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalType, setModalType] = useState<PaymentModalType>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  
  const { data: savedCards = [] } = useQuery({
    queryKey: ['paymentCards'],
    queryFn: fetchPaymentCardsApi,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactionsApi,
  });

  // userProfile in the auth store never carries a balance — nothing writes one
  // — so this card read "0 so'm" for every worker, including one who had just
  // been paid. Read it from /users/me, which is where the balance actually is.
  const { data: me } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchUserProfileApi,
  });

  const currentBalance = me?.balance ?? user?.balance ?? 0;
  const isEmployer = user?.selectedRole === 'employer';
  const totalSpent = me?.totalSpent ?? user?.totalSpent ?? 0;

  const formatMoney = (amount: number | string) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // Whether a row is money arriving or money leaving depends on which side of
  // it you are. The sign used to be `tx.type === 'deposit' ? '+' : '-'`, so a
  // worker's own wage — a credit to them — was labelled "Kirim"
  // and printed as "-275 000" in the same row.
  const myId = me?.id ?? user?.id;
  const isIncoming = (tx: any) => {
    if (tx.type === 'withdraw') return false;
    // A payout is the admin having sent the money to the worker's bank
    // account; the in-app balance goes down to match. Without this line the
    // fallback below reads workerId === me and calls it income, so the worker
    // would be shown a credit at the moment they were debited.
    if (tx.type === 'payout') return false;
    if (tx.type === 'deposit') return true;
    return !!myId && tx.workerId === myId;
  };

  // The four figures below were the literals 1.2 mln, 450k, 890k and
  // 2,540,000 — a worker with an empty balance and no completed jobs was told
  // they had earned two and a half million so'm. They come from the same
  // transactions the list underneath shows, so the two always agree.
  const sum = (rows: any[]) => rows.reduce((n, tx) => n + (Number(tx.amount) || 0), 0);
  const earned = transactions.filter((tx: any) =>
    tx.type !== 'withdraw' && ['paid', 'released', 'completed'].includes(tx.status));
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalIncome = sum(earned);
  const monthIncome = sum(earned.filter((tx: any) =>
    tx.createdAt && new Date(tx.createdAt) >= startOfMonth));
  const pendingIncome = sum(transactions.filter((tx: any) =>
    ['pending', 'held'].includes(tx.status)));
  const withdrawn = sum(transactions.filter((tx: any) =>
    tx.type === 'withdraw' && ['paid', 'completed'].includes(tx.status)));

  // One derivation of a row's title, used by both the list and the search, so
  // what a user reads is exactly what they can search for.
  const txLabel = (tx: any) => {
    const typeName = tx.type === 'payout'
      ? (language === 'uz' ? "Bank orqali to'lov" : language === 'ru' ? "Выплата на счёт" : "Bank payout")
      : tx.type === 'withdraw'
      ? (language === 'uz' ? "Mablag' yechish" : language === 'ru' ? "Снятие средств" : "Withdrawal")
      : isIncoming(tx)
        ? (language === 'uz' ? "Kirim" : language === 'ru' ? "Поступление" : "Incoming")
        : (language === 'uz' ? "Ish uchun to'lov" : language === 'ru' ? "Оплата за работу" : "Payment for work");
        
    if (tx.jobTitle) {
      return `${typeName}: ${tx.jobTitle}`;
    }
    return typeName;
  };

  const query = searchQuery.trim().toLowerCase();
  const matchesQuery = (tx: any) => {
    if (!query) return true;
    const haystack = [
      txLabel(tx),
      formatMoney(tx.amount),
      String(tx.amount ?? ''),
      tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '',
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  };

  const filteredTransactions = transactions.filter((tx: any) => {
    if (!matchesQuery(tx)) return false;
    if (txFilter === 'in') return tx.type === 'deposit';
    if (txFilter === 'out') return tx.type === 'withdraw';
    return true;
  });

  // "No transactions yet" is a lie to someone who has a history and simply
  // searched for something absent.
  const isNarrowed = !!query || txFilter !== 'all';

  const handleBack = () => {
    if (user?.selectedRole === 'employer') {
      setCurrentScreen('employer-profile');
    } else {
      setCurrentScreen('profile');
    }
  };

  return (
    <div className="bg-brand-background text-slate-900 min-h-screen pb-32 font-sans w-full max-w-6xl mx-auto md:px-6">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-brand-background flex items-center justify-between px-5 md:px-0 py-2 h-16 mb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            aria-label={language === 'uz' ? 'Orqaga' : language === 'ru' ? 'Назад' : 'Back'}
            className="active:scale-95 duration-200 p-2 hover:bg-slate-200 transition-colors rounded-full cursor-pointer"
          >
            <ArrowLeft className="text-brand-primary w-6 h-6" />
          </button>
          <h1 className="text-[18px] font-bold tracking-tight text-brand-primary">
            {language === 'uz' ? "To'lovlar" : language === 'ru' ? "Платежи" : "Payments"}
          </h1>
        </div>
        <button 
          onClick={() => {
            setShowSearch((open) => {
              if (open) setSearchQuery('');
              return !open;
            });
          }}
          aria-label={language === 'uz' ? 'Qidirish' : language === 'ru' ? 'Поиск' : 'Search'}
          aria-expanded={showSearch}
          className="active:scale-95 duration-200 p-2 hover:bg-slate-200 transition-colors rounded-full cursor-pointer"
        >
          <Search className="text-brand-primary w-6 h-6" />
        </button>
      </header>

      {showSearch && (
        <div className="sticky top-16 w-full z-40 bg-brand-background px-5 md:px-0 pb-3">
          <input
            autoFocus
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={language === 'uz' ? "To'lovlar ichidan qidirish" : language === 'ru' ? 'Поиск по платежам' : 'Search payments'}
            placeholder={language === 'uz' ? "To'lovlar ichidan qidirish..." : language === 'ru' ? 'Поиск по платежам...' : 'Search payments...'}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          />
        </div>
      )}

      <main className="pt-2 px-5 md:px-0 space-y-6">
        
        {!isEmployer ? (
          <>
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
            <p className="text-brand-primary font-bold text-sm">{formatMoney(monthIncome)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] text-center border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
              {language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'Ожидается' : 'Pending'}
            </p>
            <p className="text-blue-600 font-bold text-sm">{formatMoney(pendingIncome)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] text-center border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
              {language === 'uz' ? 'Yechilgan' : language === 'ru' ? 'Снято' : 'Withdrawn'}
            </p>
            <p className="text-slate-800 font-bold text-sm">{formatMoney(withdrawn)}</p>
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
            <p className="text-brand-primary font-bold text-lg">{formatMoney(totalIncome)}</p>
          </div>
          
          <div className="min-w-[160px] bg-white p-4 rounded-xl shadow-[0px_4px_12px_rgba(26,35,126,0.04)] border border-slate-200">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <CreditCard size={18} className="text-blue-600" />
            </div>
            <p className="text-slate-500 text-xs font-medium">
              {language === 'uz' ? 'Aktiv kartalar' : language === 'ru' ? 'Активные карты' : 'Active Cards'}
            </p>
            <p className="text-blue-600 font-bold text-lg">{savedCards.length} {language === 'uz' ? 'ta' : language === 'ru' ? 'шт' : 'pcs'}</p>
          </div>
          
          <div className="min-w-[160px] bg-white p-4 rounded-xl shadow-[0px_4px_12px_rgba(26,35,126,0.04)] border border-slate-200">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Clock size={18} className="text-slate-800" />
            </div>
            <p className="text-slate-500 text-xs font-medium">
              {language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'В ожидании' : 'Pending'}
            </p>
            <p className="text-slate-800 font-bold text-lg">{formatMoney(pendingIncome)}</p>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        
          </>
        ) : (
          <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary-container to-brand-primary p-6 text-white shadow-xl">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col items-center">
              <p className="text-white/70 text-sm font-medium tracking-wider mb-2">
                {language === 'uz' ? 'Jami xarajatlar' : language === 'ru' ? 'Общие расходы' : 'Total Expenses'}
              </p>
              <h2 className="text-[32px] font-bold leading-tight mb-2">
                {formatMoney(totalSpent)} {language === 'uz' ? "so'm" : "UZS"}
              </h2>
            </div>
          </section>
        )}
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
          
          {!isEmployer && (
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
        )}

          <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] divide-y divide-slate-100 overflow-hidden border border-slate-100">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx: any) => (
                <div key={tx.id} onClick={() => setSelectedTx(tx)} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
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
                        {txLabel(tx)}
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
                      <p className={`font-bold text-[16px] ${isIncoming(tx) ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIncoming(tx) ? '+' : '-'}{formatMoney(tx.amount)}
                      </p>
                      {tx.status === 'pending' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 mt-1">
                          {language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'В ожидании' : 'Pending'}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 mt-1">
                          {language === 'uz' ? 'Bajarildi' : language === 'ru' ? 'Успешно' : 'Done'}
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
                  {isNarrowed
                    ? (language === 'uz' ? 'Hech narsa topilmadi' : language === 'ru' ? 'Ничего не найдено' : 'Nothing found')
                    : (language === 'uz' ? 'Tranzaksiyalar yo\'q' : language === 'ru' ? 'Нет транзакций' : 'No transactions')}
                </p>
                <p className="text-slate-500 text-sm">
                  {isNarrowed
                    ? (language === 'uz' ? 'Boshqa so\'rov yoki filtr bilan urinib ko\'ring.' : language === 'ru' ? 'Попробуйте другой запрос или фильтр.' : 'Try a different search or filter.')
                    : (language === 'uz' ? 'Hozircha hech qanday to\'lov amaliyoti bajarilmagan.' : language === 'ru' ? 'Пока нет ни одной операции.' : 'No payment activity yet.')}
                </p>
              </div>
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
