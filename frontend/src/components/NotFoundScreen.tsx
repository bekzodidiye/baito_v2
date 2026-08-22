import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NotFoundScreen: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-lg w-full border border-slate-100">
        <div className="w-24 h-24 bg-blue-50 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <Search size={40} />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">404</h1>
        
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4">
          {language === 'uz' ? 'Sahifa topilmadi' : language === 'ru' ? 'Страница не найдена' : 'Page not found'}
        </h2>
        
        <p className="text-slate-600 mb-8 font-medium">
          {language === 'uz' 
            ? "Kechirasiz, siz qidirayotgan sahifa o'chirilgan yoki manzili o'zgargan bo'lishi mumkin." 
            : language === 'ru' 
            ? "Извините, запрашиваемая страница может быть удалена или ее адрес изменен." 
            : "Sorry, the page you are looking for might have been removed or had its name changed."}
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-3.5 px-6 rounded-xl font-bold hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Home size={18} />
          {language === 'uz' ? 'Bosh sahifaga qaytish' : language === 'ru' ? 'Вернуться на главную' : 'Back to Home'}
        </button>
      </div>
    </div>
  );
};
